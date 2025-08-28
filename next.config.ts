// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/NeuralSim",        // 👈 uppercase N, S
  assetPrefix: "/NeuralSim/",    // 👈 uppercase N, S
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
