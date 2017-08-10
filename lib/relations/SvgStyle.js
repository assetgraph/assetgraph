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

    attach(position, adjacentRelation) {
        const parseTree = this.from.parseTree;

        this.node = this.node || parseTree.createElement('style');
        this.node.appendChild(parseTree.createTextNode(this.to.text));

        return super.attach(position, adjacentRelation);
    }
};

module.exports = SvgStyle;
