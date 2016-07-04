System.config({
    map: {
        asset: 'asset-plugin.js',
        fooOrBar: 'fooOrBar.js'
    },
    meta: {
        '*.txt': {
            loader: 'asset'
        }
    }
});
