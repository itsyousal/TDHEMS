import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Experimental optimizations
  experimental: {
    // Explicitly set Turbopack root to the project directory to avoid
    // mis-detection errors on Windows when running the dev server.
    turbopack: {
      root: __dirname,
    },
    // Optimize package imports for faster builds and smaller bundles
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-tabs",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
    ],
  },

  // Performance headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        // Cache static assets
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Reduce build output verbosity
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
