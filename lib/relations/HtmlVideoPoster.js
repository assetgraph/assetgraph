var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlVideoPoster(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlVideoPoster, HtmlRelation);

extendWithGettersAndSetters(HtmlVideoPoster.prototype, {
    get href() {
        return this.node.getAttribute('poster');
    },

    set href(href) {
        this.node.setAttribute('poster', href);
    },

    inline: function () {
        throw new Error('HtmlVideoPoster.inline(): Not supported.');
    },

    attach: function () {
        throw new Error('HtmlVideoPoster.attach(): Not implemented.');
    },

    detach: function () {
        throw new Error('HtmlVideoPoster.detach(): Not implemented.');
    }
});

module.exports = HtmlVideoPoster;
