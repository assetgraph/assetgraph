var _ = require('underscore'),
    seq = require('seq'),
    coffeeScript = require('coffee-script'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function compileCoffeeScriptToJavaScript(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'CoffeeScript'}, queryObj)))
            .parEach(function (coffeeScriptAsset) {
                coffeeScriptAsset.getText(this.into(coffeeScriptAsset.id));
            })
            .parEach(function (coffeeScriptAsset) {
                var javaScriptAsset = new assets.JavaScript({
                    text: coffeeScript.compile(this.vars[coffeeScriptAsset.id])
                });
                assetGraph.replaceAsset(coffeeScriptAsset, javaScriptAsset);
                // FIXME: This should be a side effect of HtmlScript._setRawUrlString or something:
                assetGraph.findRelations({to: javaScriptAsset}).forEach(function (incomingRelation) {
                    if (incomingRelation.type === 'HtmlScript') {
                        var typeAttributeValue = incomingRelation.node.getAttribute('type');
                        if (typeAttributeValue === 'text/coffeescript') {
                            incomingRelation.node.removeAttribute('type');
                            incomingRelation.from.markDirty();
                        }
                    }
                });
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
