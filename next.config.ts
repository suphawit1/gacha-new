import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  reactCompiler: true,
  experimental: {
    allowedDevOrigins: [
      'gacha.telemedicproject.dpdns.org',
      'api-gacha.telemedicproject.dpdns.org'
    ]
  }
};

export default nextConfig;
