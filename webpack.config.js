const path = require('path');
const babelConfig = require('./.babelrc');

module.exports = {
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
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
