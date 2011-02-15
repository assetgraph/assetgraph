var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Base = require('./Base').Base;

function JSON(config) {
    Base.call(this, config);
}

util.inherits(JSON, Base);

_.extend(JSON.prototype, {
    contentType: 'application/json',

    defaultExtension: 'json',

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            cb(null, JSON.parse(src));
        }));
    }),

    serialize: function (cb) {
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            cb(null, JSON.stringify(parseTree));
        }));
    }
});

exports.JSON = JSON;
