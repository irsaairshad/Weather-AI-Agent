/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Export Next.js as static files that FastAPI can serve.
  output: "export",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;