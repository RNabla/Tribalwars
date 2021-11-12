const path = require('path');

module.exports = {
  entry: {
    'Infrastructure': './src/Infrastructure.js',
    'Faking': './src/Faking/Faking.bootstrap.js',
  },
  output: {
    filename: 'Hermitowski.[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist', 'dev'),
    clean: true,
  },
  mode: 'development',
};