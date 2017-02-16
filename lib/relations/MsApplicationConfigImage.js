var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function MsApplicationConfigImage(config) {
    Relation.call(this, config);
}

util.inherits(MsApplicationConfigImage, Relation);

extendWithGettersAndSetters(MsApplicationConfigImage.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = this.to.dataUrl;
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('MsApplicationConfigImage.attach: Not supported');
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = MsApplicationConfigImage;
