var Path = require('path');
var Promise = require('bluebird');
var childProcess = require('child_process');
var _ = require('lodash');
var relationLabelByType = {
    HtmlScript: '<script>',
    HtmlStyle: '<style>',
    HtmlCacheManifest: '<html manifest>',
    HtmlIFrame: '<iframe>',
    HtmlFrame: '<frame>',
    HtmlAlternateLink: '<link rel=alternate>',
    HtmlConditionalComment: function (htmlConditionalComment) {
        return '<!--[if ' + htmlConditionalComment.condition + ']>';
    },
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
    JavaScriptGetText: 'GETTEXT',
    JavaScriptGetStaticUrl: 'static url',
    CssImage: 'background-image',
    CssImport: '@import',
    CssBehavior: 'behavior',
    CssFontFaceSrc: '@font-face src',
    CssAlphaImageLoader: 'AlphaImageLoader'
};

module.exports = function (targetFileName) {
    targetFileName = targetFileName || 'assetgraph.svg';

    return function drawGraph(assetGraph) {
        var dotSrc = [
            'digraph \"' + targetFileName.replace(/^.*\/|\.[^\/\.]*$/g, '') + '\" {\n',
            'graph[rankdir=LR];',
            'nodesep=0.1;',
            'ranksep=0.0;'
        ].join('\n');
        var nextUniqueId = 1;
        var seenNodes = {};

        function addAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            dotSrc += '  ' + asset.id + ' [fontsize=12, style = ' + (asset.isLoaded ? 'solid' : 'dashed') + ', label = "' + (namePrefix || '') + (asset.url ? Path.basename(asset.url) : 'i:' + asset).replace(/"/g, '\\"') + '"];\n';
        }
        var assetsByPath = {},
            transitionStringsByPath = {};

        assetGraph.findAssets().forEach(function (asset) {
            if (asset.nonInlineAncestor) {
                var path = asset.nonInlineAncestor.url.replace(/[^\/]*(?:[\?#].*)?$/, '');
                (assetsByPath[path] = assetsByPath[path] || []).push(asset);
            }
            addAssetAsNode(asset);
        });

        assetGraph.findRelations({}, true).forEach(function (relation) {
            var target = relation.to;
            if (!target.id) {
                target = _.defaults({id: 'unresolved' + nextUniqueId}, target);
                nextUniqueId += 1;
            }
            if (!seenNodes[target.id]) {
                addAssetAsNode(target, 'o:');
            }
            var labelText = relationLabelByType[relation.type] || '';
            if (typeof labelText === 'function') {
                labelText = labelText(relation);
            }

            var transitionString = String(relation.from.id) + ' -> ' + target.id + ' [fontsize=9, arrowhead=empty, label="' + labelText.replace(/"/g, '\\"') + '"];\n',
                fromPath = relation.from.nonInlineAncestor && relation.from.nonInlineAncestor.url.replace(/[^\/]*(?:[\?#].*)?$/, '');

            if (fromPath && relation.to.nonInlineAncestor && fromPath === relation.to.nonInlineAncestor.url.replace(/[^\/]*(?:[\?#].*)?$/, '')) {
                (transitionStringsByPath[fromPath] = transitionStringsByPath[fromPath] || []).push(transitionString);
            } else {
                dotSrc += '  ' + transitionString;
            }
        });

        Object.keys(assetsByPath).forEach(function (path) {
            dotSrc +=
                '  subgraph cluster_' + nextUniqueId + ' {\n' +
                    '    style = filled;\n' +
                    '    color = lightgrey;\n' +
                    '    label = "' + path.replace(assetGraph.root, '/') + '";\n' +
                    '\n' +
                    assetsByPath[path].map(function (asset) {
                        return '    ' + asset.id + ' [style = ' + (asset.isLoaded ? 'solid' : 'dashed') + ', label = "' + (asset.url ? Path.basename(asset.url) : 'i:' + asset).replace(/"/g, '\\"') + '"];\n';
                    }).join('') +
                    (transitionStringsByPath[path] || []).map(function (transitionString) {
                        return '    ' + transitionString + '\n';
                    }).join('') +
                '  }\n\n';
            nextUniqueId += 1;
        });

        dotSrc += '}\n';
        var dotProcess = childProcess.spawn('dot', ['-T', Path.extname(targetFileName).substr(1), '-o', targetFileName]);
        dotProcess.stdin.end(dotSrc);
        dotProcess.stderr.on('data', function (chunk) {
            console.warn('dot STDERR: ' + chunk);
        });
        return Promise.fromNode(function (cb) {
            dotProcess.on('error', function (error) {
                if (error.code === 'ENOENT') {
                    cb(new Error('"dot" not found. Please install graphviz.'));
                } else {
                    cb(error);
                }
            });
            dotProcess.on('exit', function (exitCode) {
                if (exitCode) {
                    cb(new Error('dot exited with code: ' + exitCode));
                } else {
                    cb();
                }
            });
        });
    };
};
