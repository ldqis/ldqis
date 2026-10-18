/** The site base without its trailing slash, for building absolute paths. */
export const basePath = (baseUrl: string) => baseUrl.replace(/\/$/, "");

/** Dr. Reznik's Google Scholar profile. */
export const SCHOLAR_URL = "https://scholar.google.com/citations?user=cKqeJEgAAAAJ&hl=en";

/** The lab's public contact address. */
export const CONTACT_EMAIL = "lrvcs@rit.edu";

/** Primary navigation, shared by the header and the footer. */
export function primaryLinks(baseUrl: string) {
  const base = basePath(baseUrl);
  return [
    { href: `${base}/#research`, label: "Research" },
    { href: `${base}/#projects`, label: "Projects" },
    { href: `${base}/#publications`, label: "Publications" },
    { href: `${base}/people/`, label: "People" },
    { href: `${base}/news/`, label: "News" },
  ];
}

/** Footer link columns. Absolute paths, so they work off the homepage; no two go to the same place. */
export function footerGroups(baseUrl: string) {
  const base = basePath(baseUrl);
  // The header already carries the primary sections, so the footer holds only what it lacks.
  return [
    {
      heading: "The lab",
      links: [
        { href: `${base}/#funding`, label: "Funded by" },
        { href: `${base}/people/#alumni`, label: "Alumni" },
        { href: `${base}/#teaching`, label: "Teaching" },
        { href: `mailto:${CONTACT_EMAIL}?subject=Joining%20LDQIS`, label: "Join us" },
        { href: `mailto:${CONTACT_EMAIL}`, label: "Get in touch" },
      ],
    },
    {
      heading: "Elsewhere",
      links: [
        { href: SCHOLAR_URL, label: "Dr. Reznik on Google Scholar" },
        { href: "https://github.com/ldqis/ldqis", label: "Site source on GitHub" },
        { href: `${base}/news/rss.xml`, label: "RSS feed" },
      ],
    },
  ];
}
