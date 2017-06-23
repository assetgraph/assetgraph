module.exports = {
    entry: './main',
    output: {
        path: 'dist',
        filename: 'bundle.js',
        chunkFilename: 'bundle.[name].[chunkhash:8].js'
    }
};
