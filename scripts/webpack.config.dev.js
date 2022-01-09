const path = require('path');

module.exports = {
  entry: {
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
};