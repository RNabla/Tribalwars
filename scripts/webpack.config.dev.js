const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    // 'Infrastructure': './src/Infrastructure.js',
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
    filename: 'Hermitowski.[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist', 'dev'),
    clean: true,
  },
  mode: 'development',
  plugins: [
    new webpack.DefinePlugin({
      LOGGING_ENABLED: JSON.stringify(true)
    })
  ]
};