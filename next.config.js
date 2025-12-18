/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable in dev for faster compilation

  // Server components external packages
  serverExternalPackages: ['node-cron', 'cron-parser'],

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['@tabler/icons-react', 'lucide-react', 'framer-motion'],
    // Webpack layer caching for faster rebuilds
    webpackBuildWorker: true,
  },

  // Turbopack configuration (empty to allow webpack config)
  turbopack: {},

  // Aggressive webpack optimizations for FAST development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Persistent filesystem cache
      config.cache = {
        type: 'filesystem',
        cacheDirectory: '.next/cache/webpack',
        buildDependencies: {
          config: [__filename],
        },
        // More aggressive caching
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      };

      if (!isServer) {
        // Disable source maps in development for faster builds
        config.devtool = false;

        // Optimize module resolution
        config.resolve.symlinks = false;

        // Aggressive optimization for dev
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

        // Reduce the amount of work webpack does
        config.stats = 'errors-only';
      }
    }

    return config;
  },

  // Skip type checking and linting during development
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable development indicators completely
  devIndicators: false,

  // Optimize output
  output: process.env.NODE_ENV === 'development' ? 'standalone' : undefined,
};

module.exports = nextConfig;

