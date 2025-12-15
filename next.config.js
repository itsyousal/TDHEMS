// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Ensure native Prisma engines are included in serverless bundles.
  // This is critical on platforms like Netlify/AWS Lambda where the engine
  // is a native binary that must be present at runtime.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/.prisma/client/**'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },

  // Headers
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Redirects for API routes
  async redirects() {
    return [];
  },

  // No custom webpack config to avoid Turbopack conflicts in Next 16 dev mode.

  // (Don't expose NODE_ENV via next.config; keep env usage to .env files)
};

module.exports = nextConfig;
