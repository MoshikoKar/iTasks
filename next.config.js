/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Shared config: server externals, images, TypeScript
const shared = {
  serverExternalPackages: ['node-cron', 'cron-parser'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

// Production-only: explicit production path
const production = {
  output: 'standalone',
  reactStrictMode: true,
  compiler: {
    removeConsole: true,
  },
  experimental: {
    optimizePackageImports: ['@tabler/icons-react', 'lucide-react', 'framer-motion'],
  },
  webpack: (config) => config,
  turbopack: {},
};

// Development-only: faster builds, dev tools, no production optimizations
const development = {
  output: undefined,
  reactStrictMode: false,
  compiler: {
    removeConsole: false,
  },
  devIndicators: false,
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    'http://192.168.69.102:3000',
    'http://172.22.0.1:3000',
    'http://172.17.80.1:3000',
  ],
  experimental: {
    optimizePackageImports: ['@tabler/icons-react', 'lucide-react', 'framer-motion'],
    webpackBuildWorker: true,
  },
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: '.next/cache/webpack',
        buildDependencies: {
          config: [__filename],
        },
        maxAge: 1000 * 60 * 60 * 24 * 7,
      };

      if (!isServer) {
        config.devtool = false;
        config.resolve.symlinks = false;
        config.optimization = {
          ...config.optimization,
          moduleIds: 'named',
          chunkIds: 'named',
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
          minimize: false,
          usedExports: false,
          concatenateModules: false,
          providedExports: false,
          sideEffects: false,
        };
        config.stats = 'errors-only';
      }
    }
    return config;
  },
};

const nextConfig = {
  ...shared,
  ...(isDev ? development : production),
};

module.exports = nextConfig;
