/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Server components external packages
  serverExternalPackages: ['node-cron', 'cron-parser'],

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Optimize images (if you add any later)
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;

