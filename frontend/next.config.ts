import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Disabled to allow Middleware
  images: {
    unoptimized: true
  }
};

export default nextConfig;
