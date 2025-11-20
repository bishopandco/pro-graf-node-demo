import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const port = Number(process.env.PORT || 4000);
const grafanaUrl = process.env.GRAFANA_URL || "http://localhost:3000";
const grafanaUser = process.env.GRAFANA_USER || "admin";
const grafanaPass = process.env.GRAFANA_PASS || "admin";
const grafanaDatasourceId = process.env.GRAFANA_DS_ID || "1";
const sampleQuery = process.env.SAMPLE_QUERY || "gcp_gce_cpu_utilization_average";

const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok" }));

app.get("/gcp-cpu", async (c) => {
  try {
    const query = new URLSearchParams({ query: sampleQuery });
    const url = `${grafanaUrl}/api/datasources/proxy/${grafanaDatasourceId}/api/v1/query?${query.toString()}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${grafanaUser}:${grafanaPass}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      const status: ContentfulStatusCode =
        resp.status >= 200 &&
        resp.status < 600 &&
        resp.status !== 204 &&
        resp.status !== 304
          ? (resp.status as ContentfulStatusCode)
          : 500;

      return c.json(
        {
          error: "Failed to fetch data from Grafana",
          status: resp.status,
          grafanaResponse: text,
        },
        status
      );
    }

    const data = (await resp.json()) as unknown;

    return c.json({
      description: "Data returned from Grafana-proxied Prometheus query",
      query: sampleQuery,
      datasourceId: grafanaDatasourceId,
      grafanaUrl,
      prometheusData: data,
    });
  } catch (err) {
    return c.json({ error: "Unexpected error", details: String(err) }, 500);
  }
});

app.get("/metrics", (c) => {
  const body = `# HELP node_app_demo_static_cpu Synthetic CPU metric for scraping
# TYPE node_app_demo_static_cpu gauge
node_app_demo_static_cpu{project="demo-gcp-project",instance="demo-instance",zone="us-central1-a"} 0.42
`;

  return c.text(body, 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(
      `node-app (hono) listening on port ${port}; proxying Grafana at ${grafanaUrl} with datasource ${grafanaDatasourceId}`
    );
  }
);
