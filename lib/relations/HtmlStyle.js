var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlStyle(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlStyle, HtmlRelation);

extendWithGettersAndSetters(HtmlStyle.prototype, {
    get href() {
        if (this.node.nodeName.toLowerCase() === 'link') {
            return this.node.getAttribute('href');
        }
        // Else return undefined
    },

    set href(href) {
        if (this.node.nodeName === 'link') {
            this.node.setAttribute('href', href);
        } else {
            var document = this.node.ownerDocument,
                link = document.createElement('link'),
                existingMediaAttributeValue = this.node.getAttribute('media');
            if (existingMediaAttributeValue) {
                link.setAttribute('media', existingMediaAttributeValue);
            }
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', href);
            this.node.parentNode.replaceChild(link, this.node);
            this.node = link;
        }
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.node.nodeName === 'style') {
            while (this.node.firstChild) {
                this.node.removeChild(this.node.firstChild);
            }
            this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
        } else {
            var style = this.from.parseTree.createElement('style'),
                existingMediaAttributeValue = this.node.getAttribute('media');
            style.setAttribute('type', 'text/css');
            if (existingMediaAttributeValue) {
                style.setAttribute('media', existingMediaAttributeValue);
            }
            style.appendChild(this.from.parseTree.createTextNode(this.to.text));
            this.node.parentNode.replaceChild(style, this.node);
            this.node = style;
        }
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        var parseTree = asset.parseTree,
            found = false;

        this.node = parseTree.createElement('link');
        this.node.setAttribute('rel', 'stylesheet');
        if (position === 'first') {
            if (parseTree.head) {
                for (var i = 0 ; i < parseTree.head.childNodes.length ; i += 1) {
                    var childNode = parseTree.head.childNodes[i],
                        nodeName = childNode.nodeName.toLowerCase();

                    if (nodeName === 'style' || (nodeName === 'link' && /^stylesheet$/i.test(childNode.getAttribute('rel')))) {
                        found = true;
                        parseTree.head.insertBefore(this.node, childNode);
                        break;
                    }
                }
                if (!found) {
                    parseTree.head.appendChild(this.node);
                }
            } else {
                // No <head>, maybe the body of a conditional comment.
                parseTree.insertBefore(this.node, parseTree.firstChild);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlStyle;
