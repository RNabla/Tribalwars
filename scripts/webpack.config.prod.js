const path = require('path');
const webpack = require('webpack');
const versions = require('./versions.json')
const TerserPlugin = require("terser-webpack-plugin");

let commitHash = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString()
  .trim();

module.exports = {
  entry: {
    'Faking': './src/Faking/Faking.bootstrap.ts',
    'XY': './src/XY/XY.bootstrap.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: function (pathData) {
      return `Hermitowski.${pathData.runtime}.js`;
    },
    path: path.resolve(__dirname, 'dist'),
    clean: true,

  },
  plugins: [
    new webpack.BannerPlugin({
      banner:
        function (data) {
          return `
            Script: ${data.chunk.runtime}
            Created by: Hermitowski
            Version: ${versions[data.chunk.runtime]} (${commitHash})
            License: GNU GENERAL PUBLIC LICENSE VERSION 3 https://www.gnu.org/licenses/gpl-3.0.en.html

            You can find sources used to built this script here: https://github.com/RNabla/tribalwars/scripts
          `;
        }
    })
  ],
  mode: 'production',
  optimization: {
    minimize: true,
    usedExports: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          passes: 2,
          pure_funcs: [
            'logger.entry',
            'logger.log',
            'logger.exit',
            'this.logger.entry',
            'this.logger.log',
            'this.logger.exit',
            'LoggerFactory.create_instance',
          ],
        },
        format: {
          ascii_only: true
        }
      },
      extractComments: false,
    })],
  },
};