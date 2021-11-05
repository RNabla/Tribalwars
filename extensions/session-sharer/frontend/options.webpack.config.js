const path = require('path');

module.exports = {
    entry: './src/options.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'options.js'
    },
    mode: 'production'
};