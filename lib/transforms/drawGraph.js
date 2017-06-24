const Path = require('path');
const Promise = require('bluebird');
const childProcess = require('child_process');
const _ = require('lodash');
const relationLabelByType = {
    HtmlScript: '<script>',
    HtmlStyle: '<style>',
    HtmlCacheManifest: '<html manifest>',
    HtmlIFrame: '<iframe>',
    HtmlFrame: '<frame>',
    HtmlAlternateLink: '<link rel=alternate>',
    HtmlConditionalComment: htmlConditionalComment => '<!--[if ' + htmlConditionalComment.condition + ']>',
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
    JavaScriptStaticUrl: 'static url',
    CssImage: 'background-image',
    CssImport: '@import',
    CssBehavior: 'behavior',
    CssFontFaceSrc: '@font-face src',
    CssAlphaImageLoader: 'AlphaImageLoader'
};

module.exports = targetFileName => {
    targetFileName = targetFileName || 'assetgraph.svg';

    return async function drawGraph(assetGraph) {
        let dotSrc = 'digraph \"' + targetFileName.replace(/^.*\/|\.[^\/\.]*$/g, '') + '\" {\n';
        let nextUniqueId = 1;
        const seenNodes = {};

        function addAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            dotSrc += '  ' + asset.id + ' [style = ' + (asset.isLoaded ? 'solid' : 'dashed') + ', label = "' + (namePrefix || '') + (asset.url ? Path.basename(asset.url) : 'i:' + asset).replace(/"/g, '\\"') + '"];\n';
        }
        const assetsByPath = {};
        const transitionStringsByPath = {};

        for (const asset of assetGraph.findAssets()) {
            if (asset.nonInlineAncestor) {
                const path = asset.nonInlineAncestor.url.replace(/[^\/]*(?:[\?#].*)?$/, '');
                (assetsByPath[path] = assetsByPath[path] || []).push(asset);
            }
            addAssetAsNode(asset);
        }

        for (const relation of assetGraph.findRelations({}, true)) {
            let target = relation.to;
            if (!target.id) {
                target = _.defaults({id: 'unresolved' + nextUniqueId}, target);
                nextUniqueId += 1;
            }
            if (!seenNodes[target.id]) {
                addAssetAsNode(target, 'o:');
            }
            let labelText = relationLabelByType[relation.type] || '';
            if (typeof labelText === 'function') {
                labelText = labelText(relation);
            }

            const transitionString = String(relation.from.id) + ' -> ' + target.id + ' [fontsize=9, arrowhead=empty, label="' + labelText.replace(/"/g, '\\"') + '"];\n';
            const fromPath = relation.from.nonInlineAncestor && relation.from.nonInlineAncestor.url.replace(/[^\/]*(?:[\?#].*)?$/, '');

            if (fromPath && relation.to.nonInlineAncestor && fromPath === relation.to.nonInlineAncestor.url.replace(/[^\/]*(?:[\?#].*)?$/, '')) {
                (transitionStringsByPath[fromPath] = transitionStringsByPath[fromPath] || []).push(transitionString);
            } else {
                dotSrc += '  ' + transitionString;
            }
        }

        for (const path of Object.keys(assetsByPath)) {
            dotSrc +=
                '  subgraph cluster_' + nextUniqueId + ' {\n' +
                '    style = filled;\n' +
                '    color = lightgrey;\n' +
                '    label = "' + path + '";\n' +
                '\n' +
                assetsByPath[path].map(asset =>
                    '    ' + asset.id + ' [style = ' + (asset.isLoaded ? 'solid' : 'dashed') + ', label = "' +
                    (asset.url ? Path.basename(asset.url) : 'i:' + asset).replace(/"/g, '\\"') + '"];\n'
                ).join('') +
                (transitionStringsByPath[path] || []).map(transitionString =>
                    '    ' + transitionString + '\n'
                ).join('') +
                '  }\n\n';
            nextUniqueId += 1;
        }

        dotSrc += '}\n';
        const dotProcess = childProcess.spawn('dot', ['-T', Path.extname(targetFileName).substr(1), '-o', targetFileName]);
        dotProcess.stdin.end(dotSrc);
        dotProcess.stderr.on('data', chunk => console.warn('dot STDERR: ' + chunk));
        await Promise.fromNode(cb =>{
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
