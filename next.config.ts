// next.config.js
const nextConfig = {
  output: "export",
  basePath: "/NeuralSim",    // repo name
  assetPrefix: "/NeuralSim/", 
  images: {
    unoptimized: true,       // GitHub Pages can’t handle next/image optimization
  },
};

module.exports = nextConfig;
