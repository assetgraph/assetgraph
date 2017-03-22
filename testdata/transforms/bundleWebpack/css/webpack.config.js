var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: './main',
    output: {
        path: 'dist',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            // // Default loader: load all assets that are not handled
            // // by other loaders with the url loader.
            // // Note: This list needs to be updated with every change of extensions
            // // the other loaders match.
            // // E.g., when adding a loader for a new supported file extension,
            // // we need to add the supported extension to this loader too.
            // // Add one new line in `exclude` for each loader.
            // //
            // // "file" loader makes sure those assets end up in the `build` folder.
            // // When you `import` an asset, you get its filename.
            // // "url" loader works just like "file" loader but it also embeds
            // // assets smaller than specified size as data URLs to avoid requests.
            // {
            //     exclude: [
            //         /\.html$/,
            //         /\.(js|jsx)$/,
            //         /\.css$/,
            //         /\.json$/
            //     ],
            //     loader: 'url',
            //     query: {
            //         limit: 10000,
            //         name: 'media/[name].[hash:8].[ext]'
            //     }
            // },
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
