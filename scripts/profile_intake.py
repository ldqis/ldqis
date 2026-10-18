#!/usr/bin/env python3
"""Turn a parsed "profile" issue form into a people/<slug>.md (+ optional avatar).

Run by .github/workflows/profile-intake.yml. Reads the issue-parser JSON from
$ISSUE_JSON and the person's name from $ISSUE_TITLE (both via env, never
interpolated into a shell — no injection),
writes the Markdown + downloads any attached photo, and leaves the result in the
working tree for create-pull-request to commit. Output is always a reviewed PR.

Security: the slug is sanitised (no path traversal), the photo URL is host-
allowlisted to GitHub's attachment CDNs (no SSRF to arbitrary hosts), and the
download is size-capped and content-type checked.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PEOPLE = Path("src/content/people")
AVATARS = PEOPLE / "avatars"
MAX_BYTES = 8 * 1024 * 1024  # 8 MB cap on a downloaded photo
# Only fetch from GitHub's own attachment CDNs — never an arbitrary URL.
ALLOWED_HOST_RE = re.compile(
    r"^https://(github\.com/user-attachments/|[a-z0-9-]+\.githubusercontent\.com/)"
)
EXT_BY_TYPE = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}
# Optional string fields in schema order, each with the same validator the
# content schema enforces. A value that fails is DROPPED (with a warning) so the
# generated card is always schema-valid — a GITHUB_TOKEN PR doesn't trigger CI,
# so an invalid field would otherwise only surface as a broken deploy on merge.
STRING_FIELDS: list[tuple[str, "re.Pattern[str] | None"]] = [
    ("email", re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")),
    ("website", re.compile(r"^https?://")),
    ("github", re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")),
    ("linkedin", re.compile(r"^https://([a-z0-9-]+\.)?linkedin\.com/")),
    ("youtube", re.compile(r"^https://([a-z0-9-]+\.)?(youtube\.com|youtu\.be)/")),
    ("orcid", re.compile(r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$")),
    ("scholar", re.compile(r"^https://scholar\.google\.com/")),
    ("ieee", re.compile(r"^https://ieeexplore\.ieee\.org/")),
]

# "Remove fields" checkbox labels (profile.yml) → the card field each one clears.
# Keep in sync with the `clear` checkboxes options in .github/ISSUE_TEMPLATE/profile.yml.
CLEAR_LABEL_TO_KEY = {
    "Photo": "avatar",
    "Email": "email",
    "Website": "website",
    "GitHub": "github",
    "LinkedIn": "linkedin",
    "YouTube": "youtube",
    "ORCID": "orcid",
    "Google Scholar": "scholar",
    "IEEE Xplore": "ieee",
    "Years in the lab": "years_from",  # clears years_to with it
}

# URL fields where students often paste a bare domain ("abhik-roy.com"); we prepend
# https:// before validating so a missing protocol doesn't silently drop the link.
URL_FIELDS = {"website", "linkedin", "youtube", "scholar", "ieee"}


# Keep in step with LAB_FIRST_YEAR in src/lib/profile-fields.ts.
LAB_FIRST_YEAR = 2003
COHORTS = {"current member": "current", "past member": "past", "current": "current", "past": "past"}


def parse_years(text: str, this_year: int) -> tuple[int, int | str | None] | None:
    """'2018–2022' → (2018, 2022), '2021 to present' → (2021, 'present'), '2019' → (2019, None).
    None when no year in the lab's span is given, as with a count like '5'."""
    found = [int(y) for y in re.findall(r"\b(?:19|20)\d{2}\b", text)]
    if not found or not all(LAB_FIRST_YEAR <= y <= this_year for y in found):
        return None
    start = found[0]
    # Open only when the word ends the start year's own range: "2021–present (MS 2023)" is
    # open, "2016-2019 (now at Google)" is not.
    if re.search(
        rf"\b{start}\s*(?:[-–—]|to|until|through)?\s*(?:present|now|current|today)\b", text, re.I
    ) or re.search(rf"\bsince\s+{start}\b", text, re.I):
        return start, "present"
    end = found[1] if len(found) > 1 else None
    if end is not None and end < start:
        return None
    return start, end


def clean(value: object) -> str | None:
    """Empty / unanswered form fields come through as "" or "_No response_"."""
    if not isinstance(value, str):
        return None
    v = value.strip()
    return None if v == "" or v == "_No response_" else v


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not s or "/" in s or ".." in s:
        sys.exit(f"::error::cannot derive a safe slug from name {name!r}")
    return s


def card_slug(name: str) -> str:
    """The existing card whose name matches, ignoring a title, case and spacing, so
    "Dr. Sergei Chuprov" updates sergei-chuprov.md instead of starting a second card.
    A new person gets a slug from their name."""

    def key(n: str) -> str:
        return " ".join(re.sub(r"^(dr|prof)\.?\s+", "", n.strip(), flags=re.I).lower().split())

    for md in sorted(PEOPLE.glob("[!_]*.md")):
        m = re.search(r"^name:\s*(.*?)\s*$", md.read_text(encoding="utf-8"), re.M)
        if m and key(unquote(m.group(1))) == key(name):
            return md.stem
    return slugify(name)


def unquote(val: str) -> str:
    """A YAML scalar as written in a card: "double" (backslash escapes), 'single' ('' is a
    quote), or plain."""
    if len(val) >= 2 and val[0] == '"' and val[-1] == '"':
        return val[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    if len(val) >= 2 and val[0] == "'" and val[-1] == "'":
        return val[1:-1].replace("''", "'")
    return val


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def parse_existing(md_path: Path) -> dict[str, str]:
    """Parse an existing card's frontmatter so an update can MERGE into it.
    research(2026-05): partial update (PATCH) is the least-surprising default for
    user-driven profile edits — a field the form leaves blank keeps its current
    value rather than being wiped (PUT). Required identity fields still come from
    the form; everything optional merges."""
    fields: dict[str, str] = {}
    if not md_path.exists():
        return fields
    text = md_path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    for line in (m.group(1) if m else "").splitlines():
        lm = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if not lm:
            continue
        fields[lm.group(1)] = unquote(lm.group(2).strip())
    return fields


def download_photo(markdown: str, slug: str) -> str | None:
    """Pull the first image URL out of the photo field and save it. Returns the
    frontmatter-relative path, or None (then we fall back to GitHub avatar / initials)."""
    # GitHub issue-form photo uploads arrive as `<img src="URL">` HTML (not
    # markdown), so match that first; also handle markdown `](URL)` / `(<URL>)`
    # and a bare URL. Each pattern captures the URL as group 1 and stops before a
    # closing quote / angle bracket / paren so no trailing `"` sneaks into the URL.
    m = (
        re.search(r'src=["\'](https://[^"\'>\s]+)', markdown)
        or re.search(r"\(<?(https://[^)\s>]+)>?\)", markdown)
        or re.search(r"(https://[^\s\"'<>)]+)", markdown)
    )
    if not m:
        return None
    url = m.group(1)
    if not ALLOWED_HOST_RE.match(url):
        print(f"::warning::ignoring photo URL from a non-GitHub host: {url}")
        return None
    req = urllib.request.Request(url, headers={"User-Agent": "ldqis-profile-intake"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (host-allowlisted above)
            ctype = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            ext = EXT_BY_TYPE.get(ctype)
            if not ext:
                print(f"::warning::attachment is not a supported image ({ctype!r}); skipping")
                return None
            data = resp.read(MAX_BYTES + 1)
    except Exception as e:  # noqa: BLE001 — a bad photo must not fail the whole intake
        print(f"::warning::could not download the photo: {e}")
        return None
    if len(data) > MAX_BYTES:
        print("::warning::photo exceeds 8 MB; skipping")
        return None
    # Each person's photo lives in avatars/<slug>/, the folder the CMS uploads into too, so
    # the new photo replaces whatever is there and no one else's file can be touched.
    clear_avatar_files(slug)
    folder = AVATARS / slug
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{slug}.{ext}").write_bytes(data)
    return f"./avatars/{slug}/{slug}.{ext}"


def clear_avatar_files(slug: str) -> None:
    """Empty avatars/<slug>/ so a removed or replaced photo leaves no orphan file."""
    folder = AVATARS / slug
    if folder.is_dir():
        for f in folder.iterdir():
            if f.is_file():
                f.unlink()


def next_order() -> int:
    """A new card's order = one past the current max, so submissions append to the end
    of the list — no ties, and nobody has to pick a number. Maintainers can still feature
    someone by editing `order` to a lower value; updates keep their existing order."""
    orders = []
    for p in PEOPLE.glob("*.md"):
        if p.name.startswith("_"):  # skip the _example template
            continue
        m = re.search(r"^order:\s*(\d+)", p.read_text(encoding="utf-8"), re.M)
        if m:
            orders.append(int(m.group(1)))
    return max(orders) + 1 if orders else 1


def main() -> None:
    fields = json.loads(os.environ["ISSUE_JSON"])
    # Name is the issue's own title (category prefix stripped) — not asked twice.
    name = re.sub(r"^\s*\[[^\]]*\]\s*", "", os.environ.get("ISSUE_TITLE", "")).strip()
    if not name:
        sys.exit("::error::name (the issue title) is required")
    role = clean(fields.get("role")) or ""
    cohort = COHORTS.get((clean(fields.get("cohort")) or "").lower(), "current")
    slug = card_slug(name)
    md_path = PEOPLE / f"{slug}.md"
    existing = parse_existing(md_path)  # {} for a new person; an update merges into this
    name = " ".join(name.split())
    if existing.get("name") and name == name.lower():
        name = existing["name"]  # a title typed in lowercase keeps the card's own capitals

    # "Remove fields" checkboxes — github-issue-parser v3 emits an array of the
    # checked option labels; map each to the card field it clears. An explicit
    # clear beats "keep existing", but a freshly-typed value still wins over it.
    checked = fields.get("clear") or []
    if isinstance(checked, str):  # defensive: a non-array form → treat as a single item
        checked = [checked]
    to_clear = {CLEAR_LABEL_TO_KEY[c.strip()] for c in checked if c.strip() in CLEAR_LABEL_TO_KEY}

    # Blank initials keep the card's own, else the site derives them from the name.
    initials = clean(fields.get("initials")) or existing.get("initials")
    lines = [f"initials: {yaml_quote(initials[:3])}"] if initials else []
    lines += [f"name: {yaml_quote(name)}", f"role: {yaml_quote(role)}"]
    for key, validator in STRING_FIELDS:
        val = clean(fields.get(key))
        if val and key in URL_FIELDS:
            # bare domain or http:// → the https:// link the validator needs
            val = "https://" + re.sub(r"^https?://", "", val, flags=re.I)
        if val and validator and not validator.match(val):
            print(f"::warning::ignoring {key}={val!r} — doesn't match the expected format")
            val = None
        # new value wins → else an explicit clear removes it → else keep the card's value
        chosen = val or (None if key in to_clear else existing.get(key))
        if chosen:
            lines.append(f"{key}: {yaml_quote(chosen)}")
    years_text = clean(fields.get("years"))
    years = parse_years(years_text, datetime.now(timezone.utc).year) if years_text else None
    if years_text and years is None:
        print(f"::warning::ignoring years={years_text!r}: give a year or range, like 2018-2022")
    if years:
        start, end = years
    elif "years_from" in to_clear:
        start = end = None
    else:
        start, end = existing.get("years_from"), existing.get("years_to")
    if start:
        lines.append(f"years_from: {start}")
        if end:
            lines.append(f"years_to: {end}")
    lines.append(f"cohort: {cohort}")
    lines.append(f"order: {existing.get('order') or next_order()}")
    new_photo = download_photo(fields.get("photo") or "", slug)
    if new_photo:
        avatar = new_photo  # uploaded a new photo
    elif "avatar" in to_clear:
        clear_avatar_files(slug)  # explicit remove → drop the file, fall back to GitHub avatar / initials
        avatar = None
    else:
        avatar = existing.get("avatar")  # keep current
    if avatar:
        lines.append(f"avatar: {avatar}")
    if existing.get("lead") == "true":
        lines.append("lead: true")

    md_path.write_text("---\n" + "\n".join(lines) + "\n---\n", encoding="utf-8")
    print(f"wrote {md_path} (photo: {'yes' if avatar else 'no'}, cleared: {','.join(sorted(to_clear)) or 'none'})")

    if gh_out := os.environ.get("GITHUB_OUTPUT"):
        action = "Update" if existing else "Add"
        safe_name = name.replace("\n", " ").replace("\r", " ")
        with open(gh_out, "a", encoding="utf-8") as f:
            f.write(f"slug={slug}\nname={safe_name}\naction={action}\n")


if __name__ == "__main__":
    main()
