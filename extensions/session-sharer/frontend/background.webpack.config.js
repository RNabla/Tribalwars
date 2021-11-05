const path = require('path');

module.exports = {
  entry: './src/background.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'background.js'
  },
  mode: 'production'
};