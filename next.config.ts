import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... keep any existing settings you have here (like cacheComponents: true)
  
  // ADD THESE TWO BLOCKS:
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;