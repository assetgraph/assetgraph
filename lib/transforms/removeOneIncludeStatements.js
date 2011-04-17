var _ = require('underscore'),
    seq = require('seq');

// Temporary hack until there's a better way to get to the "unpopulated" relations

module.exports = function (queryObj) {
    return function removeOneIncludeStatements(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq()
            .extend(assetGraph.findAssets({type: 'JavaScript'}))
            .parEach(function (javaScript) {
                javaScript.getOriginalRelations(this.into(javaScript.id));
            })
            .parEach(function (javaScript) {
                this.vars[javaScript.id].forEach(function (originalRelation) {
                    if (originalRelation.type === 'JavaScriptStaticInclude') {
                        javaScript.detachRelation(originalRelation);
                        assetGraph.markAssetDirty(javaScript);
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
