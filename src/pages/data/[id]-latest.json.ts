// Each project's latest experiment as this build saw it, with readable labels: the fields the
// source serves for it, plus the dataset and strategy names the page shows.
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { datasetLabel, strategyLabel } from "../../lib/experiment-format";

export const getStaticPaths = (async () =>
  (await getCollection("experimentStats"))
    .filter((entry) => entry.data.latest_experiment)
    .map((entry) => ({
      params: { id: entry.id },
      props: { latest: entry.data.latest_experiment!, generatedAt: entry.data.generated_at },
    }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(
    JSON.stringify({
      ...props.latest,
      dataset_label: datasetLabel(props.latest.dataset),
      strategy_label: strategyLabel(props.latest.strategy),
      generated_at: props.generatedAt,
    }),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
