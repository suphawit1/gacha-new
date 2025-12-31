import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/gacha-new', 
  assetPrefix: '/gacha-new/', 
};

export default nextConfig;