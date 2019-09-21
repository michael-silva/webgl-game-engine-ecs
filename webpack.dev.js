const path = require('path');
const merge = require('webpack-merge');
const config = require('./webpack.config');

module.exports = merge(config, {
  mode: 'development',
  watch: true,
  devServer: {
    port: 3000,
    contentBase: path.join(__dirname, 'demo'),
    watchContentBase: true,
    publicPath: '/dist/',
  },
  entry: {
    demos: './demo/index.js',
    books: './demo/book/index.js',
  },
});
