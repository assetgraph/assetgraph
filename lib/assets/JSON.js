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

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            cb(null, JSON.parse(src));
        }));
    }),

    prettyPrint: function (cb) {
        this.isPretty = true;
        process.nextTick(cb);
    },

    minify: function (cb) {
        this.isPretty = false;
        process.nextTick(cb);
    },

    serialize: function (cb) {
        var that = this;
        that.getParseTree(error.passToFunction(cb, function (parseTree) {
            var jsonString;
            if (that.isPretty) {
                jsonString = JSON.stringify(parseTree, undefined, "    ") + "\n";
            } else {
                jsonString = JSON.stringify(parseTree);
            }
            cb(null, jsonString);
        }));
    }
});

exports.JSON = JSON;
