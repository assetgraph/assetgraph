System.config({
    map: {
        css: 'plugin-css/css.js'
    },
    meta: {
        '*.css': {
            loader: 'css.js'
        }
    },
    packages: {
        css: {
            main: 'css.js'
        }
    }
});
