import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The card images read their fonts from disk: ship the font files with every server function (Netlify, Vercel...).
  outputFileTracingIncludes: { "/**": ["./assets/fonts/**/*"] },
  // Team logos, player headshots and news photos served by ESPN's CDNs.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "s.espncdn.com" },
      { protocol: "https", hostname: "espnmedia-cdn.akamaized.net" },
    ],
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
