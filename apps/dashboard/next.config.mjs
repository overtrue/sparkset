/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    return [
      // API routes
      {
        source: '/api/:path*',
        destination: 'http://localhost:3333/:path*',
      },
      // Auth routes
      {
        source: '/auth/:path*',
        destination: 'http://localhost:3333/auth/:path*',
      },
      // Datasource routes
      {
        source: '/datasources/:path*',
        destination: 'http://localhost:3333/datasources/:path*',
      },
      // Action routes
      {
        source: '/actions/:path*',
        destination: 'http://localhost:3333/actions/:path*',
      },
      // Conversation routes
      {
        source: '/conversations/:path*',
        destination: 'http://localhost:3333/conversations/:path*',
      },
      // AI Provider routes
      {
        source: '/ai-providers/:path*',
        destination: 'http://localhost:3333/ai-providers/:path*',
      },
      // Dataset routes
      {
        source: '/api/datasets/:path*',
        destination: 'http://localhost:3333/api/datasets/:path*',
      },
      // Chart routes
      {
        source: '/api/charts/:path*',
        destination: 'http://localhost:3333/api/charts/:path*',
      },
      // Dashboard routes
      {
        source: '/api/dashboards/:path*',
        destination: 'http://localhost:3333/api/dashboards/:path*',
      },
    ];
  },
}

export default nextConfig
