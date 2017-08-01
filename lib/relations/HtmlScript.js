const HtmlRelation = require('./HtmlRelation');

class HtmlScript extends HtmlRelation {
    get href() {
        return this.node.getAttribute('src') || undefined;
    }

    set href(href) {
        this.node.setAttribute('src', href);
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    }

    inline() {
        super.inline();
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
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        if (this.to.isAsset && this.to.type !== 'JavaScript') {
            this.node.setAttribute('type', this.to.contentType);
        }
        if (position === 'first' || position === 'last') {
            const existingScriptNodes = asset.parseTree.getElementsByTagName('script');
            if (existingScriptNodes.length > 0) {
                if (position === 'first') {
                    existingScriptNodes[0].parentNode.insertBefore(this.node, existingScriptNodes[0]);
                } else {
                    const lastScriptNode = existingScriptNodes[existingScriptNodes.length - 1];
                    lastScriptNode.parentNode.insertBefore(this.node, lastScriptNode.nextSibling);
                }
            } else if (asset.parseTree.body) {
                asset.parseTree.body.insertBefore(this.node, asset.parseTree.body.firstChild);
            } else {
                asset.parseTree.head.appendChild(this.node);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlScript;
