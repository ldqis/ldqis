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
    ("linkedin", re.compile(r"^https?://([a-z0-9-]+\.)?linkedin\.com/")),
    ("youtube", re.compile(r"^https?://([a-z0-9-]+\.)?(youtube\.com|youtu\.be)/")),
    ("orcid", re.compile(r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$")),
    ("scholar", re.compile(r"^https://scholar\.google\.com/")),
    ("ieee", re.compile(r"^https://ieeexplore\.ieee\.org/")),
    ("years", re.compile(r".*\b(19|20)\d{2}\b")),  # a year or range, not a count
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
    "Years in the lab": "years",
}

# URL fields where students often paste a bare domain ("abhik-roy.com"); we prepend
# https:// before validating so a missing protocol doesn't silently drop the link.
URL_FIELDS = {"website", "linkedin", "youtube", "scholar", "ieee"}


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
        key, val = lm.group(1), lm.group(2).strip()
        if len(val) >= 2 and val[0] == '"' and val[-1] == '"':
            val = val[1:-1].replace('\\"', '"').replace("\\\\", "\\")
        fields[key] = val
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
    AVATARS.mkdir(parents=True, exist_ok=True)
    # drop any prior avatar of a different extension so a format change doesn't orphan a file
    for old in AVATARS.glob(f"{slug}.*"):
        if old.name != f"{slug}.{ext}":
            old.unlink()
    (AVATARS / f"{slug}.{ext}").write_bytes(data)
    return f"./avatars/{slug}.{ext}"


def clear_avatar_files(slug: str) -> None:
    """Remove any avatars/<slug>.* so a removed photo leaves no orphan image file."""
    if AVATARS.exists():
        for f in AVATARS.glob(f"{slug}.*"):
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
    initials = clean(fields.get("initials")) or "?"
    role = clean(fields.get("role")) or ""
    cohort = clean(fields.get("cohort")) or "current"
    if cohort not in ("current", "past"):
        cohort = "current"
    slug = slugify(name)
    md_path = PEOPLE / f"{slug}.md"
    existing = parse_existing(md_path)  # {} for a new person; an update merges into this

    # "Remove fields" checkboxes — github-issue-parser v3 emits an array of the
    # checked option labels; map each to the card field it clears. An explicit
    # clear beats "keep existing", but a freshly-typed value still wins over it.
    checked = fields.get("clear") or []
    if isinstance(checked, str):  # defensive: a non-array form → treat as a single item
        checked = [checked]
    to_clear = {CLEAR_LABEL_TO_KEY[c.strip()] for c in checked if c.strip() in CLEAR_LABEL_TO_KEY}

    lines = [f"initials: {yaml_quote(initials[:3])}", f"name: {yaml_quote(name)}", f"role: {yaml_quote(role)}"]
    for key, validator in STRING_FIELDS:
        val = clean(fields.get(key))
        if val and key in URL_FIELDS and not val.lower().startswith(("http://", "https://")):
            val = "https://" + val  # bare domain → add the protocol the validator needs
        if val and validator and not validator.match(val):
            print(f"::warning::ignoring {key}={val!r} — doesn't match the expected format")
            val = None
        # new value wins → else an explicit clear removes it → else keep the card's value
        chosen = val or (None if key in to_clear else existing.get(key))
        if chosen:
            lines.append(f"{key}: {yaml_quote(chosen)}")
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
