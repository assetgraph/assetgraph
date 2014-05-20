(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['backbone'], function (Backbone) {
            return factory(Backbone || root.Backbone);
        });
    } else {
        factory(Backbone);
    }
}(this, function (Backbone) {
    Backbone.LocalStorage = 'I am the local storage. Muha!';

    return Backbone.LocalStorage;
}));
