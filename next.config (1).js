/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.externals = [...config.externals, { bufferutil: "bufferutil", "utf-8-validate": "utf-8-validate", canvas: 'canvas' }];
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000/socket.io/:path*',
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  }
}

module.exports = nextConfig;
