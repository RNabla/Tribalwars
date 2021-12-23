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
    // 'Infrastructure': './src/Infrastructure.js',
    // 'Faking': './src/Faking/Faking.bootstrap.js',
    // 'FakingTS': './src/Faking/Faking2.ts',
    'Faking': './src/Faking/Faking.bootstrap.ts',
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
    }),
    new webpack.DefinePlugin({
      LOGGING_ENABLED: JSON.stringify(false)
    })
  ],
  mode: 'production',
  optimization: {
    minimize: true,
    usedExports: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          // toplevel: true,
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
        // mangle: {
        //   toplevel: true,
        //   properties: {
        //     // builtins: true,
        //     // debug: true,
        //     // keep_quoted: "yes",
        //     // keep_quoted: true,
        //     keep_quoted: "strict",
        //     // reserved: ["TribalWars"]
        //   },
        // },
        format: {
          ascii_only: true
        }
      },
      extractComments: false,

    })],
  },
};