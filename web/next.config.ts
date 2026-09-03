import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REQ-027 follow-up: required for the multi-stage Docker build (see repo-root Dockerfile) — traces
  // only the node_modules the app actually needs into .next/standalone/server.js. Doesn't change
  // `next dev` at all, only `next build`'s output shape.
  output: "standalone",
  experimental: {
    serverActions: {
      // REQ-022 Phase 2: default is 1MB (confirmed via the bundled Next.js docs), which would
      // silently reject a legitimate Scenario import CSV before it ever reaches
      // scenario-import-actions.ts's own validation — raised to match that feature's own stated
      // file-size ceiling.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
