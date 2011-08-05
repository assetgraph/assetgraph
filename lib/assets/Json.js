var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Json(config) { // Avoid clobbering the global JSON object
    Text.call(this, config);
}

util.inherits(Json, Text);

extendWithGettersAndSetters(Json.prototype, {
    contentType: 'application/json',

    defaultExtension: '.json',

    isPretty: false,

    get parseTree() {
        if (!this._parseTree) {
            try {
                this._parseTree = JSON.parse(this.text);
            } catch (e) {
                throw new Error("Json parse error in " + (this.url || "(inline)") + ": " + e.message);
            }
        }
        return this._parseTree;
    },

    get text() {
        if (!this._text) {
            if (this._parseTree) {
                if (this.isPretty) {
                    this._text = JSON.stringify(this.parseTree, undefined, "    ") + "\n";
                } else {
                    this._text = JSON.stringify(this.parseTree);
                }
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
    },

    prettyPrint: function () {
        this.isPretty = true;
        this.markDirty();
    },

    minify: function () {
        this.isPretty = false;
        this.markDirty();
    }
});

module.exports = Json;
