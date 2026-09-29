import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run alongside `next dev` (e.g. NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pin the project root (avoids picking up lockfiles from parent folders).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
