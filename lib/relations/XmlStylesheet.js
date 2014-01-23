var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function XmlStylesheet(config) {
    Relation.call(this, config);
}

util.inherits(XmlStylesheet, Relation);

extendWithGettersAndSetters(XmlStylesheet.prototype, {
    get href() {
        var matchData = this.node.data.match(/href="([^"]*)"/);
        if (matchData) {
            return matchData[1].replace(/&quot;/, '"').replace(/&amp;/, '&');
        }
    },

    set href(href) {
        this.node.data = this.node.data.replace(/href="([^"]*)"/, 'href="' + href.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"');
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = 'data:' + this.to.contentType + ';base64,' + this.to.rawSrc.toString('base64');
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('XmlStylesheet.attach: Not supported');
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = XmlStylesheet;
