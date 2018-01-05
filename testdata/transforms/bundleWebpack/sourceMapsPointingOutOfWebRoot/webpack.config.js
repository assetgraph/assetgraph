module.exports = {
    entry: require('path').resolve(__dirname, './src/index'),
    devtool: 'source-map',
    output: {
        path: require('path').resolve(__dirname, './webroot/dist/'),
        filename: 'bundle.js',
        publicPath: '/dist/'
    }
};
