// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
 basePath: "/neuralsim",
 assetPrefix: "/neuralsim/",
  images: {
    unoptimized: true,           // needed for next/image in static export
  },
};

module.exports = nextConfig;
