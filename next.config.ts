const nextConfig = {
  output: "export",
  basePath: "/NeuralSim",   // important for GH Pages
  assetPrefix: "/NeuralSim/",
  trailingSlash: true,      // 🔑 ensures static files get written as /page/index.html
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
