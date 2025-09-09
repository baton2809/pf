module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // suppress annoying warnings
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules/,
        },
        {
          message: /Critical dependency: the request of a dependency is an expression/,
        },
        {
          message: /Module not found/,
        },
        {
          message: /export .* was not found/,
        },
      ];

      // suppress source map warnings
      if (process.env.GENERATE_SOURCEMAP === 'false') {
        webpackConfig.devtool = false;
      }

      // reduce webpack output noise
      webpackConfig.stats = 'minimal';

      return webpackConfig;
    },
  },
  devServer: {
    client: {
      overlay: {
        warnings: false,
        errors: false,
      },
    },
  },
};