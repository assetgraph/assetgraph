/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../error');

var Base = module.exports = function (config) {
    _.extend(this, config);
    this.baseUrlForRelations = ('url' in this) ? path.dirname(this.url) : this.baseUrl; // Get that outta here and into sitegraph!
};

Base.prototype = {
    encoding: 'utf8', // Change to 'binary' in subclass for images etc.

    getSrc: function (cb) {
        var This = this;
        if ('src' in this) {
            process.nextTick(function () {
                cb(null, This.src);
            });
        } else if (this.srcProxy) {
            this.srcProxy(error.throwException(function (src) {
                This.src = src;
                cb(null, src);
            }));
        } else {
            cb(new Error("Don't know how to get asset src!"));
        }
    },

    getRelationTypes: function (cb) {
        this.getRelations(error.passToFunction(cb, function (relations) {
            cb(null, _.keys(relations));
        }));
    },

    getRelationsOfType: function (type, cb) {
        this.getRelations(error.passToFunction(cb, function (relations) {
            cb(null, relations[type] || []);
        }));
    }
};
