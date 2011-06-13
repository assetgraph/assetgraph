var _ = require('underscore'),
    seq = require('seq');

module.exports = function (queryObj) {
    return function inlineJavaScriptGetOneText(assetGraph, cb) {
        seq(assetGraph.findRelations(_.extend({type: 'JavaScriptOneGetText'}, queryObj)))
            .parEach(function (relation) {
                if (!relation.to.isText) {
                    this(new Error('transforms.inlineJavaScriptGetOneText: Cannot inline non-text asset: ' + relation.to));
                } else {
                    assetGraph.getAssetText(relation.to, this.into(relation.id));
                }
            })
            .parEach(function (relation) {
                relation.node.splice(0, relation.node.length, 'string', this.vars[relation.id]);
                assetGraph.markAssetDirty(relation.from);
                assetGraph.removeRelation(relation);
                // Remove the inline asset if it just became an orphan:
                if (assetGraph.findRelations({to: relation.to}).length === 0) {
                    assetGraph.removeAsset(relation.to);
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
