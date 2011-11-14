var _ = require('underscore'),
    seq = require('seq'),
    less = require('less'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function compileLessToCss(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'Less'}, queryObj)))
            .parEach(function (lessAsset) {
                less.render(lessAsset.text, this.into(lessAsset.id));
            })
            .parEach(function (lessAsset) {
                var cssAsset = new assets.Css({
                    text: this.vars[lessAsset.id]
                });
                lessAsset.replaceWith(cssAsset);
                cssAsset.incomingRelations.forEach(function (incomingRelation) {
                    if (incomingRelation.type === 'HtmlStyle') {
                        var relAttributeValue = incomingRelation.node.getAttribute('rel');
                        if (relAttributeValue) {
                            incomingRelation.node.setAttribute('rel', relAttributeValue.replace(/\bstylesheet\/less\b/, 'stylesheet'));
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
