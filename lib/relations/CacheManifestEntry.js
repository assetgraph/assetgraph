/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function CacheManifestEntry(config) {
    Base.call(this, config);
}

util.inherits(CacheManifestEntry, Base);

extendWithGettersAndSetters(CacheManifestEntry.prototype, {
    get href() {
        return this.node.tokens[this.node.tokens.length - 1];
    },

    set href(href) {
        // In the CACHE section and NETWORK sections there's only one token per entry,
        // in FALLBACK there's the online url followed by the offline url (the one we want).
        // Just overwrite the last token with the url:
        this.node.tokens[this.node.tokens.length - 1] = href;
    }
});

module.exports = CacheManifestEntry;
