var _ = require('underscore');

module.exports = function (queryObj) {
    return function removeEmptyJavaScripts(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript', isLoaded: true, isEmpty: true}, queryObj)).forEach(function (asset) {
            var everyIncomingRelationRemoved = true;
            asset.incomingRelations.forEach(function (incomingRelation) {
                if (incomingRelation.type === 'HtmlScript') {
                    for (var i = 0 ; i < incomingRelation.node.attributes.length ; i += 1) {
                        var attribute = incomingRelation.node.attributes[i];
                        if (attribute.name !== 'src' &&
                            (attribute.name !== 'defer' || attribute.value !== 'defer') &&
                            (attribute.name !== 'async' || attribute.value !== 'async') &&
                            (attribute.name !== 'type' || attribute.value !== 'text/javascript')) {

                            everyIncomingRelationRemoved = false;
                            return;
                        }
                    }
                }
                incomingRelation.detach();
            });
            if (everyIncomingRelationRemoved) {
                assetGraph.removeAsset(asset, true);
            }
        });
    };
};
