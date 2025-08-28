const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  output: 'export',   // enable static export
  basePath: isProd ? '/NeuralSim' : '',
  images: {
    unoptimized: true,
  },
}
