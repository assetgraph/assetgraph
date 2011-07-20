var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    Text = require('./Text');

function Json(config) { // Avoid clobbering the global JSON object
    Text.call(this, config);
}

util.inherits(Json, Text);

_.extend(Json.prototype, {
    contentType: 'application/json',

    defaultExtension: '.json',

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(passError(cb, function (decodedSrc) {
            var parseTree;
            try {
                parseTree = JSON.parse(decodedSrc);
            } catch (e) {
                return cb(new Error("Json parse error in " + (that.url || "(inline)") + ": " + e.message));
            }
            cb(null, parseTree);
        }));
    }),

    prettyPrint: function (cb) {
        this.isPretty = true;
        this.markDirty();
        process.nextTick(cb);
    },

    minify: function (cb) {
        this.isPretty = false;
        process.nextTick(cb);
    },

    getText: function (cb) {
        var that = this;
        that.getParseTree(passError(cb, function (parseTree) {
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

module.exports = Json;
