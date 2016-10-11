var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlScript(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlScript, HtmlRelation);

extendWithGettersAndSetters(HtmlScript.prototype, {
    get href() {
        return this.node.getAttribute('src') || undefined;
    },

    set href(href) {
        this.node.setAttribute('src', href);
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.node.hasAttribute('src')) {
            this.node.removeAttribute('src');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
        this.from.markDirty();
        // Make sure that _patchUpSerializedText gets rerun when the asset is reserialized
        // so that </script> is escaped and the correct trimming will happen:
        this.to._text = this.to._rawSrc = null;
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        if (this.to.isAsset && this.to.type !== 'JavaScript') {
            this.node.setAttribute('type', this.to.contentType);
        }
        if (position === 'first') {
            var existingScriptNodes = asset.parseTree.getElementsByTagName('script');
            if (existingScriptNodes.length > 0) {
                existingScriptNodes[0].parentNode.insertBefore(this.node, existingScriptNodes[0]);
            } else if (asset.parseTree.body) {
                asset.parseTree.body.insertBefore(this.node, asset.parseTree.body.firstChild);
            } else {
                asset.parseTree.head.appendChild(this.node);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlScript;
