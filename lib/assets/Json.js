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

    set parseTree(parseTree) {
        this._parseTree = parseTree;
        delete this._rawSrc;
        delete this._text;
        this.markDirty();
    },

    get text() {
        if (!this._text) {
            if (this._parseTree) {
                this.emit('serialize', this);
                if (this.isPretty) {
                    this._text = JSON.stringify(this._parseTree, undefined, "    ") + "\n";
                } else {
                    this._text = JSON.stringify(this._parseTree);
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
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
    },

    minify: function () {
        this.isPretty = false;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
    }
});

module.exports = Json;
