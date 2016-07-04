System.config({
    map: {
        asset: 'systemjs-asset-plugin/asset-plugin.js',
        fooOrBar: 'fooOrBar.js'
    },
    meta: {
        '*.txt': {
            loader: 'asset'
        }
    }
});
