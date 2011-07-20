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
        this.getText(passError(cb, function (text) {
            var parseTree;
            try {
                parseTree = JSON.parse(text);
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
        process.nextTick(function () {
            if (parseTree in that) {
                if (that.isPretty) {
                    cb(null, JSON.stringify(that.parseTree, undefined, "    ") + "\n");
                } else {
                    cb(null, JSON.stringify(that.parseTree));
                }
            } else {
                Text.prototype.getText.call(that, cb);
            }
        });
    }
});

module.exports = Json;
