var Path = require('path'),
    fs = require('fs'),
    childProcess = require('child_process'),
    _ = require('underscore'),
    relationLabelByType = {
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
        JavaScriptInclude: 'INCLUDE',
        JavaScriptGetText: 'GETTEXT',
        JavaScriptGetStaticUrl: 'GETSTATICURL',
        JavaScriptAmdDefine: 'define',
        JavaScriptAmdRequire: 'require',
        CssImage: 'background-image',
        CssImport: '@import',
        CssBehavior: 'behavior',
        CssFontFaceSrc: '@font-face src',
        CssAlphaImageLoader: 'AlphaImageLoader'
    };

module.exports = function (targetFileName) {
    targetFileName = targetFileName || 'assetgraph.svg';

    return function drawGraph(assetGraph, cb) {
        var dotSrc = 'digraph \"' + targetFileName.replace(/^.*\/|\.[^\/\.]*$/g, '') + '\" {\n',
            nextUniqueId = 1,
            seenNodes = {};

        function addAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            dotSrc += '  ' + asset.id + ' [style = ' + (asset.isLoaded ? 'solid' : 'dashed') + ', label = "' + (namePrefix || '') + (asset.url ? Path.basename(asset.url) : 'i:' + asset).replace(/"/g, '\\"') + '"];\n';
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
                target = _.defaults({id: 'unresolved' + nextUniqueId++}, target);
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
                '  subgraph cluster_' + (nextUniqueId++) + ' {\n' +
                    '    style = filled;\n' +
                    '    color = lightgrey;\n' +
                    '    label = "' + path + '";\n' +
                    '\n' +
                    assetsByPath[path].map(function (asset) {
                        return '    ' + asset.id + ' [style = ' + (asset.isLoaded ? 'solid' : 'dashed') + ', label = "' + (asset.url ? Path.basename(asset.url) : 'i:' + asset).replace(/"/g, '\\"') + '"];\n';
                    }).join('') +
                    (transitionStringsByPath[path] || []).map(function (transitionString) {
                        return '    ' + transitionString + '\n';
                    }).join('') +
                '  }\n\n';
        });

        dotSrc += '}\n';
        var dotProcess = childProcess.spawn('dot', ['-T', Path.extname(targetFileName).substr(1), '-o', targetFileName]);
        dotProcess.stdin.end(dotSrc);
        dotProcess.stderr.on('data', function (chunk) {
            console.warn('dot STDERR: ' + chunk);
        });
        dotProcess.on('exit', function (exitCode) {
            if (exitCode) {
                cb(new Error('dot exited with code: ' + exitCode));
            } else {
                cb();
            }
        });
    };
};
