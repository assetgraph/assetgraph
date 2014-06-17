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

    inline: function () {},

    attach: function (asset, position, adjacentRelation) {
        var parseTree = asset.parseTree;
        var svg = parseTree.getElementsByTagName('svg')[0];

        this.node = this.node || parseTree.createElement('style');
        this.node.appendChild(parseTree.createTextNode(this.to.text));

        if (position === 'first') {
            var inserted = [].slice.call(svg.childNodes).some(function (node) {
                if (node.tagName && node.tagName.toLowerCase() === 'style') {
                    return node.parentNode.insertBefore(this.node, node);
                }
            }.bind(this));

            if (!inserted) {
                svg.insertBefore(this.node, svg.firstChild);
            }

        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgStyle;
