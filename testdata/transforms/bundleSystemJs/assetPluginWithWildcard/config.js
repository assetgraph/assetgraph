System.config({
    map: {
        asset: 'systemjs-asset-plugin/asset-plugin.js'
    },
    meta: {
        '*.txt': {
            loader: 'asset'
        }
    }
});
