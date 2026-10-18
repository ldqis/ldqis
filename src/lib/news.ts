/** A news tag as readers see it: "federated-learning" becomes "Federated learning". */
export const formatTag = (tag: string) => {
  const words = tag.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Tags as one line of plain text. */
export const formatTags = (tags: string[]) => tags.map(formatTag).join(", ");
