const HtmlRelation = require('./HtmlRelation');

class HtmlStyle extends HtmlRelation {
    get href() {
        if (this.node.nodeName.toLowerCase() === 'link') {
            return this.node.getAttribute('href');
        }
        // Else return undefined
    }

    set href(href) {
        if (this.node.nodeName === 'link') {
            this.node.setAttribute('href', href);
        } else {
            const document = this.node.ownerDocument;
            const link = document.createElement('link');
            for (const attribute of Array.from(this.node.attributes)) {
                if (attribute.name !== 'type') {
                    link.setAttribute(attribute.name, attribute.value);
                }
            }
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', href);
            this.node.parentNode.replaceChild(link, this.node);
            this.node = link;
        }
    }

    inline() {
        super.inline();
        if (this.node.nodeName.toLowerCase() === 'style') {
            while (this.node.firstChild) {
                this.node.removeChild(this.node.firstChild);
            }
            this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
        } else {
            const style = this.from.parseTree.createElement('style');
            style.setAttribute('type', 'text/css');
            for (const attribute of Array.from(this.node.attributes)) {
                if (attribute.name !== 'type' && attribute.name !== 'href' && attribute.name !== 'rel') {
                    style.setAttribute(attribute.name, attribute.value);
                }
            }

            style.appendChild(this.from.parseTree.createTextNode(this.to.text));
            this.node.parentNode.replaceChild(style, this.node);
            this.node = style;
        }
        this.from.markDirty();
        return this;
    }

    attachToHead(asset, position, adjacentNode) {
        const parseTree = asset.parseTree;

        if (this.to.isInline) {
            this.node = parseTree.createElement('style');
            this.node.appendChild(parseTree.createTextNode(this.to.text));
        } else {
            this.node = parseTree.createElement('link');
            this.node.setAttribute('rel', 'stylesheet');
        }

        super.attachToHead(asset, position, adjacentNode);
    }

    attach(asset, position, adjacentRelation) {
        const parseTree = asset.parseTree;
        let found = false;

        this.node = parseTree.createElement('link');
        this.node.setAttribute('rel', 'stylesheet');
        if (position === 'first' || position === 'last') {
            // FIXME: This doesn't do the right thing when asset.outgoingRelations hasn't been populated yet.
            // Fix it up when assets fully own their outgoing relations :/
            const existingHtmlStyles = asset.isPopulated ? asset.outgoingRelations.filter(relation => relation.type === 'HtmlStyle') : [];
            const firstExistingHtmlStyle = existingHtmlStyles[0];
            const lastExistingHtmlStyle = existingHtmlStyles.length > 0 && existingHtmlStyles[existingHtmlStyles.length - 1];
            if (position === 'last' && lastExistingHtmlStyle && lastExistingHtmlStyle.node.parentNode.nodeName.toLowerCase() !== 'head') {
                position = 'after';
                adjacentRelation = lastExistingHtmlStyle;
                this.attachNodeBeforeOrAfter(position, adjacentRelation);
            } else if (position === 'first' && firstExistingHtmlStyle && firstExistingHtmlStyle.node.parentNode.nodeName.toLowerCase() !== 'head') {
                position = 'before';
                adjacentRelation = firstExistingHtmlStyle;
                this.attachNodeBeforeOrAfter(position, adjacentRelation);
            } else if (parseTree.head) {
                for (const childNode of Array.from(parseTree.head.childNodes)) {
                    const nodeName = childNode.nodeName.toLowerCase();

                    if (nodeName === 'style' || (nodeName === 'link' && /^stylesheet$/i.test(childNode.getAttribute('rel')))) {
                        found = true;
                        if (position === 'first') {
                            parseTree.head.insertBefore(this.node, childNode);
                        } else {
                            // position === 'last'
                            parseTree.head.appendChild(this.node);
                        }
                        break;
                    }
                }
                if (!found) {
                    parseTree.head.appendChild(this.node);
                }
            } else {
                // No <head>, maybe the body of a conditional comment.
                if (position === 'first') {
                    parseTree.insertBefore(this.node, parseTree.firstChild);
                } else {
                    // position === 'last'
                    if (parseTree.body) {
                        parseTree.body.appendChild(this.node);
                    } else {
                        parseTree.appendChild(this.node);
                    }
                }
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlStyle;
