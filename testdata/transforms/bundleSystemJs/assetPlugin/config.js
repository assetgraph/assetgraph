System.config({
    map: {
        fooOrBar: 'fooOrBar.js'
    },
    meta: {
        '*.txt': {
            loader: 'asset'
        }
    },
    packages: {
        asset: {
            main: {
                build: './url-builder.js',
                default: './url.js'
            }
        }
    }
});
