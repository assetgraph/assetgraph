System.config({
    buildConfig: {
        map: {
            css: 'plugin-css/css.js'
        },
        meta: {
            '*.css': {
                loader: 'css'
            }
        }
    }
}), console.log('foo');
