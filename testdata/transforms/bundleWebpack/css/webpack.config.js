var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: './main',
    output: {
        path: 'dist',
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    use: ['css-loader']
                })
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('[name].css')
    ]
};
