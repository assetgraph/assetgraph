require.config({
    shim: {
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: [
                'underscore'
            ],
            exports: 'Backbone'
        }
    },
    paths: {
        underscore: '../vendor/underscore',
        backbone: '../vendor/backbone'
    }
});

require(['backbone'], function (Backbone) {
    console.log('Underscore loaded:', Backbone.hasUnderscore);
});
