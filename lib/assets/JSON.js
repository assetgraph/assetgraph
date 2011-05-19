var util = require('util'),
    _ = require('underscore'),
    error = require('../util/error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Text = require('./Text');

function _JSON(config) { // Avoid clobbering the global JSON object
    Text.call(this, config);
}

util.inherits(_JSON, Text);

_.extend(_JSON.prototype, {
    contentType: 'application/json',

    defaultExtension: 'json',

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(error.passToFunction(cb, function (decodedSrc) {
            var parseTree;
            try {
                parseTree = JSON.parse(decodedSrc);
            } catch (e) {
                return cb(new Error("JSON parse error in " + (that.url || "(inline)") + ": " + e.message));
            }
            cb(null, parseTree);
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

    getText: function (cb) {
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

module.exports = _JSON;
