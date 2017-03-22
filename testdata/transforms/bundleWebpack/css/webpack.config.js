var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: './main',
    output: {
        path: 'dist',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract('style', 'css?importLoaders=1!postcss')
                // Note: this won't work without `new ExtractTextPlugin()` in `plugins`.
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('css/[name].css')
    ]
};
