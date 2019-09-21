const path = require('path');
const babelConfig = require('./.babelrc');

module.exports = {
  devtool: 'source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      '@wge/core': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        },
      }, {
        test: /\.(glsl)$/,
        use: [
          {
            loader: 'raw-loader',
            options: {},
          },
        ],
      },
    ],
  },
};
