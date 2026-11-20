/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/weather',
        destination: '/weather-mcp',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;

