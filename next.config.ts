import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // The service worker must always be re-checked so a fix reaches phones quickly.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
