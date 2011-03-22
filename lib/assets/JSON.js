var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Base = require('./Base').Base;

function _JSON(config) { // Avoid clobbering the global JSON object
    Base.call(this, config);
}

util.inherits(_JSON, Base);

_.extend(_JSON.prototype, {
    contentType: 'application/json',

    defaultExtension: 'json',

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(error.passToFunction(cb, function (decodedSrc) {
            cb(null, JSON.parse(decodedSrc));
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

exports.JSON = _JSON;
