// Each project's experiment stats as this build rendered them, exactly as the source served
// them. The scheduled deploy compares this copy with the live endpoint to decide whether to
// rebuild, and the next build falls back to it if the endpoint is unreachable.
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

export const getStaticPaths = (async () =>
  (await getCollection("experimentStats")).map((entry) => ({
    params: { id: entry.id },
    props: { data: entry.data },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.data), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
