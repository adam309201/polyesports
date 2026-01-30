import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img-cdn.hltv.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.cloudflare.steamstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'shared.cloudflare.steamstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pandascore.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.pandascore.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'polymarket-upload.s3.us-east-2.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.polymarket.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
