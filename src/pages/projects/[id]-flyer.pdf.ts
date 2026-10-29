// Each project's information flyer at /projects/<id>-flyer.pdf, copied from the PDF its entry
// names. The URL depends only on the project, so the link the lab shares keeps working when
// the file is replaced in the CMS under another name.
import { readFile } from "node:fs/promises";
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { flyerFile } from "../../lib/project-flyer";

export const getStaticPaths = (async () =>
  (await getCollection("projects"))
    .filter((entry) => entry.data.flyer && entry.filePath)
    .map((entry) => ({
      params: { id: entry.id },
      props: { file: flyerFile(entry.filePath!, entry.data.flyer!) },
    }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(await readFile(props.file), {
    headers: { "Content-Type": "application/pdf" },
  });
