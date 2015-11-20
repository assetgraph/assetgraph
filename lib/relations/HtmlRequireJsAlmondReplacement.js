var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlRequireJsAlmondReplacement(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlRequireJsAlmondReplacement, HtmlRelation);

extendWithGettersAndSetters(HtmlRequireJsAlmondReplacement.prototype, {
    get href() {
        return this.node.getAttribute('data-almond').replace(/(?:\.js)?$/, '.js');
    },

    set href(href) {
        this.node.setAttribute('data-almond', href.replace(/\.js$/, ''));
    },

    inline: function () {
        throw new Error('relations.HtmlRequireJsAlmondReplacement.inline: Not supported.');
    },

    attach: function () {
        throw new Error('relations.HtmlRequireJsAlmondReplacement.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute('data-almond');
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlRequireJsAlmondReplacement;
