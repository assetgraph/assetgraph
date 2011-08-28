var _ = require('underscore'),
    coffeeScript = require('coffee-script'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function compileCoffeeScriptToJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'CoffeeScript'}, queryObj)).forEach(function (coffeeScriptAsset) {
            var javaScriptAsset = new assets.JavaScript({
                text: coffeeScript.compile(coffeeScriptAsset.text)
            });
            assetGraph.replaceAsset(coffeeScriptAsset, javaScriptAsset);
            // FIXME: This should be a side effect of setting HtmlScript.href or something:
            assetGraph.findRelations({to: javaScriptAsset}).forEach(function (incomingRelation) {
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
