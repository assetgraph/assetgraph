System.config({
    production: true,
    paths: {
        locale: 'foo/locale.js',
        environment: 'foo/environment.js'
    },
    meta: {
        '*.i18n': { loader: 'i18nLoader.js' },
        '*.configjson': { loader: 'configLoader.js' }
    }
});
