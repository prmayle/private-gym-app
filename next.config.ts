import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle punycode deprecation warning for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        punycode: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Suppress specific warnings from problematic packages
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Add rule to handle punycode usage in dependencies
    config.module.rules.push({
      test: /node_modules.*\.js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  
  // Additional optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
  
  // Reduce console output
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
