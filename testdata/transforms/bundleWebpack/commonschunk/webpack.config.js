var webpack = require('webpack');

module.exports = {
    entry: {
        main: './main',
        secondary: './secondary'
    },
    output: {
        path: 'dist',
        filename: 'bundle.[name].js'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: 'common',
            filename: 'common.js'
        })
    ]
};
