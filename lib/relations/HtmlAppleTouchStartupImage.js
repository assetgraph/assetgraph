var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlAppleTouchStartupImage(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlAppleTouchStartupImage, HtmlRelation);

extendWithGettersAndSetters(HtmlAppleTouchStartupImage.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'apple-touch-startup-image');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlAppleTouchStartupImage;
