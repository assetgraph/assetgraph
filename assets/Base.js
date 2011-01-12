/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor');

var Base = module.exports = function (config) {
    _.extend(this, config);
    this.relations = [];
};

Base.prototype = {
    encoding: 'utf8', // Change to 'binary' in subclass for images etc.

    getSrc: makeBufferedAccessor('src', function (cb) {
        if (this.srcProxy) {
            this.srcProxy(cb);
        } else {
            cb(new Error("Don't know how to get asset src!"));
        }
    }),

    toString: function () {
        return "[" + this.type + ('id' in this ? "/" + this.id : "") + "]";
    }
};
