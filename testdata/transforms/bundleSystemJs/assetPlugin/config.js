System.config({
    map: {
        asset: 'asset.js',
        fooOrBar: 'fooOrBar.js'
    },
    meta: {
        '*.txt': {
            loader: 'asset'
        }
    }
});
