module.exports = {
    entry: {
        main: './main',
        unused: './unused'
    },
    output: {
        path: 'dist',
        filename: 'bundle.[name].js'
    }
};
