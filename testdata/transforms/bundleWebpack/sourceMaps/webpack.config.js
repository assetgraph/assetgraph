module.exports = {
    entry: './main',
    output: {
        path: 'dist',
        filename: 'bundle.js',
        devtoolModuleFilenameTemplate: '/[resource-path]'
    },
    devtool: 'source-map'
};
