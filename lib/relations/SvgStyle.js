var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    SvgRelation = require('./SvgRelation'),
    AssetGraph = require('../');

function SvgStyle(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgStyle, SvgRelation);

extendWithGettersAndSetters(SvgStyle.prototype, {
    get href() {
        return undefined;
    },

    set href(href) {
        var document = this.from.parseTree;
        var styleSheetNode = document.createProcessingInstruction('xml-stylesheet', 'type="' + this.to.contentType + '" href="' + href + '"');

        document.insertBefore(styleSheetNode, document.getElementsByTagName('svg')[0]);

        var xmlStylesheet = new AssetGraph.XmlStylesheet({
            from: this.from,
            to: this.to,
            node: styleSheetNode
        });
        this.assetGraph.addRelation(xmlStylesheet);

        // Cleanup
        this.node.parentNode.removeChild(this.node);
        this.assetGraph.removeRelation(this);

        this.from.markDirty();

        return xmlStylesheet;
    },

    inline: function () {
        throw new Error('SvgStyle.inline(): Not supported. This relation type is already inline by default.');
    },

    attach: function (asset, position, adjacentRelation) {
        var parseTree = asset.parseTree;
        this.node = parseTree.createElement('style');
        if (position === 'first') {
            var svg = parseTree.getElementsByTagName('svg')[0];
            var inserted = [].slice.call(svg.childNodes).some(function (node) {
                if (node.tagName && node.tagName.toLowerCase() === 'style') {
                    parseTree.insertBefore(this.node, node);
                    return true;
                }
            });

            if (!inserted) {
                svg.appendChild(this.node);
            }

            this.node.appendChild(parseTree.createTextNode(this.to.text));
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgStyle;
