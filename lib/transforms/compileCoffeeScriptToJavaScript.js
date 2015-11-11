var _ = require('lodash');

module.exports = function (queryObj) {
    return function compileCoffeeScriptToJavaScript(assetGraph) {
        var coffeeScript,
            coffeeScriptAssets = assetGraph.findAssets(_.extend({type: 'CoffeeScript'}, queryObj));
        if (coffeeScriptAssets.length > 0) {
            try {
                coffeeScript = require('coffee-script');
            } catch (e) {
                assetGraph.emit('warn', new Error('compileCoffeeScriptToJavaScript: Found ' + coffeeScriptAssets.length + ' coffeescript asset(s), but no coffeescript compiler is available. Please install coffeescript in your project so compileCoffeeScript can require it.'));
                return;
            }
        }
        coffeeScriptAssets.forEach(function (coffeeScriptAsset) {
            var nonInlineAncestor = coffeeScript.nonInlineAncestor;
            var sourceUrl = (nonInlineAncestor && nonInlineAncestor.url) || coffeeScriptAsset.url;
            var targetUrl = sourceUrl && sourceUrl.replace(/\.coffee$|$/, '.js');
            var result = coffeeScript.compile(coffeeScriptAsset.text, { sourceMap: true });
            if (typeof result === 'string') {
                result = { js: result };
            }
            var sourceMap;
            if (result.v3SourceMap) {
                sourceMap = JSON.parse(result.v3SourceMap);
                sourceMap.file = targetUrl;
                sourceMap.sourceRoot = undefined;
                if (sourceUrl) {
                    sourceMap.sources = [ sourceUrl ];
                }
            }
            var javaScriptAsset = new assetGraph.JavaScript({
                text: result.js,
                sourceUrl: sourceUrl,
                sourceMap: sourceMap
            });
            if (targetUrl) {
                javaScriptAsset.url = targetUrl;
            }
            coffeeScriptAsset.replaceWith(javaScriptAsset);
            // FIXME: This should be a side effect of setting HtmlScript.href or something:
            javaScriptAsset.incomingRelations.forEach(function (incomingRelation) {
                if (incomingRelation.type === 'HtmlScript') {
                    var typeAttributeValue = incomingRelation.node.getAttribute('type');
                    if (typeAttributeValue === 'text/coffeescript') {
                        incomingRelation.node.removeAttribute('type');
                        incomingRelation.from.markDirty();
                    }
                }
            });
        });
    };
};
