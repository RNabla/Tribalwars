const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    'Storage': './test/inf/Storage.ts',
    'MapFiles': './test/inf/MapFiles.ts',
    'Faking': './test/Faking/Faking.ts',
    'Faking.troops': './test/Faking/Faking.troops.ts',
    'Faking.targets': './test/Faking/Faking.targets.ts',
    'Faking.targets.blocking': './test/Faking/Faking.targets.blocking.ts',
    'Faking.targets.date_ranges': './test/Faking/Faking.targets.date_ranges.ts',
    'Faking.targets.pool': './test/Faking/Faking.targets.pool.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /(\.txt)|(\.xml)|(\.html)$/, use: {
          loader: 'raw-loader', options: {
            esModule: false,
          }
        }
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'Hermitowski.[name].[contenthash].test.js',
    path: path.resolve(__dirname, 'dist', 'test'),
    clean: true,

  },
  mode: 'development',
  plugins: []
};