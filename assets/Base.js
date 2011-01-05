/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor');

var Base = module.exports = function (config) {
    _.extend(this, config);
    this.relations = {};
};

Base.prototype = {
    encoding: 'utf8', // Change to 'binary' in subclass for images etc.

    getSrc: makeBufferedAccessor('src', function (cb) {
        var This = this;
        if (this.srcProxy) {
            this.srcProxy(error.passToFunction(cb, function (src) {
                This.src = src;
                cb(null, src);
            }));
        } else {
            cb(new Error("Don't know how to get asset src!"));
        }
    }),

    getPointerTypes: function (cb) {
        this.getPointers(error.passToFunction(cb, function (pointers) {
            cb(null, _.keys(pointers));
        }));
    },

    getPointersOfType: function (type, cb) { // Of => By please
        this.getPointers(error.passToFunction(cb, function (pointers) {
            cb(null, pointers[type] || []);
        }));
    },

    getRelationTypes: function () {
        return _.keys(this.relations);
    },

    getRelationsByType: function (type) {
        return this.relations[type] || [];
    }
};
