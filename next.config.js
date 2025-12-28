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

  // Enable type checking in production builds
  typescript: {
    ignoreBuildErrors: false,
  },

  // Disable development indicators completely
  devIndicators: false,

  // Allow cross-origin requests from local network devices
  // This allows access from other devices on the same LAN
  // Add specific IPs as needed when accessing from different devices
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    // Your Android tablet IP
    'http://192.168.69.102:3000',
    // Common local network IPs - add more as needed
    'http://192.168.0.1:3000',
    'http://192.168.1.1:3000',
    'http://192.168.69.1:3000',
    // Add more device IPs here as needed, e.g.:
    // 'http://192.168.69.103:3000',
    // 'http://192.168.69.104:3000',
  ],

  // Optimize output
  output: process.env.NODE_ENV === 'development' ? 'standalone' : undefined,
};

module.exports = nextConfig;

