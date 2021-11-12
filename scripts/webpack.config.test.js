const path = require('path');

module.exports = {
  entry: {
    'Storage': './test/Storage.js',
    'MapFiles': './test/MapFiles.js',
    'Faking': './test/Faking.js',
  },
  output: {
    filename: 'Hermitowski.[name].test.js',
    path: path.resolve(__dirname, 'dist', 'test'),
    clean: true,
  },
  mode: 'development',
};