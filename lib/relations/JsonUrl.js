var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JsonUrl(config) {
    Relation.call(this, config);
}

util.inherits(JsonUrl, Relation);

extendWithGettersAndSetters(JsonUrl.prototype, {
    get href() {
        return this.hrefScope[this.hrefProperty];
    },

    set href(href) {
        this.hrefScope[this.hrefProperty] = href;
    },

    inline: function () {
        throw new Error('JsonUrl.inline(): Not supported.');
    },

    attach: function () {
        throw new Error('JsonUrl.attach(): Not supported.');
    },

    detach: function () {
        throw new Error('JsonUrl.detach(): Not supported.');
    }
});

module.exports = JsonUrl;
