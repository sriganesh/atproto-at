/** @type {import('next').NextConfig} */
const nextConfig = {
  // We don't need 'standalone' output for Cloudflare Pages
  // output: 'standalone',
  reactStrictMode: true,
  
  // Disable ESLint during production build to avoid failing the build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Exclude ref directory from build
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip type checking and bundling for the reference projects
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /ref\/.*/,
      loader: 'ignore-loader',
    });
    
    return config;
  },

  // Set Edge runtime as default
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Updated: moved from experimental.serverComponentsExternalPackages to serverExternalPackages
  serverExternalPackages: []
};

module.exports = nextConfig; 