System.config({
    map: {
        asset: 'systemjs-asset-plugin/asset-plugin.js',
        lang: 'lang.js'
    },
    meta: {
        '*.txt': {
            loader: 'asset'
        }
    },
    production: true
});
