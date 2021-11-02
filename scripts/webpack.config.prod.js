const path = require('path');
const webpack = require('webpack');
const version = require('./version.json')

let commitHash = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString()
  .trim();

module.exports = {
  entry: {
    'Infrastructure': './src/Infrastructure.js',
    'Faking': './src/Faking.js',
  },
  output: {
    filename: function (pathData) {
      return `Hermitowski.${pathData.runtime}.${version[pathData.runtime]}.js`;
    },
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new webpack.BannerPlugin({
      banner:
        function (data) {
          return `
          
          Script: ${data.chunk.runtime}
          Created by: Hermitowski
          Version: ${version[data.chunk.runtime]} (${commitHash})
          Licence: GNU GENERAL PUBLIC LICENSE VERSION 3 https://www.gnu.org/licenses/gpl-3.0.en.html

          You can find sources used to built this script here: https://github.com/RNabla/tribalwars/scripts
          `;
        }
    }),
  ],
  mode: 'production',
  optimization: {
    minimize: true,
  },
};