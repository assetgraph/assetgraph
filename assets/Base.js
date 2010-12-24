/*global module, require*/
var path = require('path'),
    _ = require('underscore');

var Base = module.exports = function (config) {
    _.extend(this, config);
    this.baseUrlForRelations = ('url' in this) ? path.dirname(this.url) : this.baseUrl;
    this.relations = {};
};

Base.prototype = {
    encoding: 'utf8', // Change to 'binary' in subclass for images etc.

    getRelationTypes: function (cb) {
        var This = this;
        process.nextTick(function () {
            cb(null, _.keys(This.relations));
        });
    },

    getRelationsOfType: function (type, cb) {
        var This = this;
        process.nextTick(function () {
            cb(null, This.relations[type] || []);
        });
    }
};
