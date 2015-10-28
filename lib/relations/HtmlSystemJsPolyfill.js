var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function SystemJsPolyfill(config) {
    HtmlRelation.call(this, config);
}

util.inherits(SystemJsPolyfill, HtmlRelation);

extendWithGettersAndSetters(SystemJsPolyfill.prototype, {
    get href() {
        return this.node.getAttribute('data-systemjs-polyfill').replace(/(?:\.js)?$/, '.js');
    },

    set href(href) {
        this.node.setAttribute('data-systemjs-polyfill', href.replace(/\.js$/, ''));
    },

    inline: function () {
        throw new Error('relations.SystemJsPolyfill.inline: Not supported.');
    },

    attach: function () {
        throw new Error('relations.SystemJsPolyfill.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute('data-systemjs-polyfill');
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = SystemJsPolyfill;
