import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/top.tsx"),
    route("hearing", "routes/hearing.tsx"),
    route("results", "routes/results.tsx"),
    route("compare", "routes/compare.tsx"),
  ]),
] satisfies RouteConfig;
