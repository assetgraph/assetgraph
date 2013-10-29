module.exports = function () {
    return function replaceRequireJsWithAlmond(assetGraph) {
        assetGraph.findRelations({
            type: 'HtmlRequireJsAlmondReplacement'
        }).forEach(function (almondRelation) {
            assetGraph.findRelations({
                type: 'HtmlScript',
                from: almondRelation.from
            }).forEach(function (scriptRelation) {
                scriptRelation.to.replaceWith(new assetGraph[almondRelation.to.type]({
                    text: almondRelation.to.text
                }));
            });

            assetGraph.removeAsset(almondRelation.to, true);
        });
    };
};
