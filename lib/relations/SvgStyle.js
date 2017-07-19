const SvgRelation = require('./SvgRelation');
const AssetGraph = require('../AssetGraph');

class SvgStyle extends SvgRelation {
    get href() {
        return undefined;
    }

    set href(href) {
        const document = this.from.parseTree;
        const styleSheetNode = document.createProcessingInstruction('xml-stylesheet', 'type="' + this.to.contentType + '" href="' + href + '"');

        document.insertBefore(styleSheetNode, document.getElementsByTagName('svg')[0]);

        const xmlStylesheet = new AssetGraph.XmlStylesheet({
            to: this.to,
            node: styleSheetNode
        });
        this.from.addRelation(xmlStylesheet);

        // Cleanup
        this.node.parentNode.removeChild(this.node);
        this.from.removeRelation(this);

        this.from.markDirty();

        return xmlStylesheet;
    }

    inline() {}

    attach(asset, position, adjacentRelation) {
        const parseTree = asset.parseTree;
        const svg = parseTree.getElementsByTagName('svg')[0];

        this.node = this.node || parseTree.createElement('style');
        this.node.appendChild(parseTree.createTextNode(this.to.text));

        if (position === 'first') {
            const inserted = Array.from(svg.childNodes).some(node => {
                if (node.tagName && node.tagName.toLowerCase() === 'style') {
                    return node.parentNode.insertBefore(this.node, node);
                }
            });

            if (!inserted) {
                svg.insertBefore(this.node, svg.firstChild);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = SvgStyle;
