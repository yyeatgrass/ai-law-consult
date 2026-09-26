import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The release bundle drops sharp's platform-specific binaries
  // (scripts/release.mjs), so image optimization must stay off.
  images: { unoptimized: true },
};

export default nextConfig;
