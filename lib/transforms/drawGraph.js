var path = require('path'),
    _ = require('underscore');

var relationLabelByType = {
    HtmlScript: '<script>',
    HtmlStyle: '<style>',
    HtmlCacheManifest: '<html manifest>',
    HtmlIFrame: '<iframe>',
    HtmlFrame: '<frame>',
    HtmlAlternateLink: '<link rel=alternate>',
    HtmlConditionalComment: function (htmlConditionalComment) {return '<!--[if ' + htmlConditionalComment.condition + ']>';},
    HtmlImage: '<img>',
    HtmlAudio: '<audio>',
    HtmlShortcutIcon: 'icon',
    HtmlVideo: '<video>',
    HtmlVideoPoster: '<video poster>',
    HtmlEmbed: '<embed>',
    HtmlApplet: '<applet>',
    HtmlObject: '<object>',
    HtmlEdgeSideInclude: '<esi:include>',
    HtmlAnchor: '<a>',
    HtmlRequireJsMain: 'data-main',
    JavaScriptOneInclude: 'one.include',
    JavaScriptOneGetText: 'one.getText',
    JavaScriptOneGetStaticUrl: 'one.getStaticUrl',
    JavaScriptAmdDefine: 'define',
    JavaScriptAmdRequire: 'require',
    CssImage: 'background-image',
    CssImport: '@import',
    CssBehavior: 'behavior',
    CssFontFaceSrc: '@font-face src',
    CssAlphaImageLoader: 'AlphaImageLoader'
};

module.exports = function (targetFileName) {
    var graphviz;
    try {
        graphviz = require('graphviz');
    } catch (e) {
        throw new Error('transforms.drawGraph: The "graphviz" module is required. Please run "npm install graphviz" and try again (tested with version 0.0.5).');
    }

    return function drawGraph(assetGraph) {
        var nextUniqueId = 1,
            g = graphviz.digraph("G"),
            seenNodes = {};

        function addAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            g.addNode(asset.id, {
                label: "\"" + (namePrefix || '') + (asset.url ? path.basename(asset.url) : 'i:' + asset) + "\""
            });
        }
        assetGraph.findAssets().forEach(function (asset) {
            addAssetAsNode(asset);
        });
        assetGraph.findRelations({}, true).forEach(function (relation) {
            var target = relation.to;
            if (!target.id) {
                target = _.defaults({id: 'unresolved' + nextUniqueId++}, target);
            }
            if (!seenNodes[target.id]) {
                addAssetAsNode(target, 'o:');
            }
            var label = relationLabelByType[relation.type] || '';
            if (typeof label === 'function') {
                label = label(relation);
            }
            g.addEdge(relation.from.id, target.id, {
                fontsize: '9',
                arrowhead: 'empty',
                label: "\"" + label.replace(/\"/g, "\\\"") + "\""
            });
        });
        g.output(path.extname(targetFileName).substr(1), targetFileName);
    };
};
