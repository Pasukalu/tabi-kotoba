import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '/tabi-kotoba';

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export',
        assetPrefix: `${publicBasePath}/`,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
