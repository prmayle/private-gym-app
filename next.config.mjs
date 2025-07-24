/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	// Optimize for development
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	// Optimize webpack
	webpack: (config, { dev, isServer }) => {
		if (dev && !isServer) {
			// Reduce chunk size for faster HMR
			config.optimization.splitChunks = {
				chunks: "all",
				cacheGroups: {
					vendor: {
						test: /[\\/]node_modules[\\/]/,
						name: "vendors",
						chunks: "all",
					},
				},
			};
		}
		return config;
	},
	// Experimental features for better performance
	experimental: {
		optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
	},
};

export default nextConfig;
