# Grafana + Prometheus + Node example

This project stands up a small stack with Docker Compose:

- Prometheus with a synthetic GCP-like metric (`gcp_gce_cpu_utilization_average`)
- Grafana provisioned with a Prometheus datasource and sample dashboard
- Node.js (TypeScript + Hono) service that calls a Grafana-prometheus query and exposes a simple API

## Run it

```sh
docker compose up --build
```

What you get:

- Grafana: http://localhost:3000 (admin/admin). The dashboard `GCP CPU Demo` is provisioned automatically.
- Prometheus: http://localhost:9090
- Node API: http://localhost:4000

Example call that fetches the Grafana query via the Grafana proxy to Prometheus:

```sh
curl http://localhost:4000/gcp-cpu | jq
```

Health and scrape endpoints:

- `GET /healthz` from the Node service for a basic check.
- `GET /metrics` exposes a tiny Prometheus text-format metric for demonstration.

## How it works

- `prometheus/rules.yml` creates a recording rule that emits a synthetic GCP-like CPU utilization series so the stack has data without talking to real GCP.
- Grafana is provisioned from `grafana/provisioning/**`: the Prometheus datasource uses UID `prometheus-default`, and a dashboard at `grafana/provisioning/dashboards/json/sample-dashboard.json` charts the synthetic metric.
- The Node endpoint (`Hono` app, TypeScript) at `/gcp-cpu` calls `GET /api/datasources/proxy/<id>/api/v1/query` on Grafana (basic auth `admin:admin`) with the query `gcp_gce_cpu_utilization_average`, then returns the proxied Prometheus payload.

## Tweaks

- To point Grafana at a different Prometheus, change `grafana/provisioning/datasources/datasource.yml`.
- If you add more datasources and the ID is not `1`, update the `GRAFANA_DS_ID` environment variable for the Node service in `docker-compose.yml`.
- Swap `SAMPLE_QUERY` in `docker-compose.yml` for any other PromQL expression you want the Node endpoint to use.
