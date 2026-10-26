import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server binds 0.0.0.0, so browser requests from 127.0.0.1
  // are cross-origin unless this host is allowed. Without it, the
  // dev socket never connects and the page stays unhydrated.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      { source: "/projects", destination: "/works", permanent: false },
      { source: "/projects/:slug", destination: "/works/:slug", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
