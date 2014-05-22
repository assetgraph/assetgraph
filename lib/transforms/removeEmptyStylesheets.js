var _ = require('underscore');

module.exports = function (queryObj) {
    return function removeEmptyStylesheets(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Css', isLoaded: true, isEmpty: true}, queryObj)).forEach(function (asset) {
            var everyIncomingRelationRemoved = true;
            asset.incomingRelations.forEach(function (incomingRelation) {
                if (incomingRelation.type === 'HtmlStyle') {
                    for (var i = 0 ; i < incomingRelation.node.attributes.length ; i += 1) {
                        var attribute = incomingRelation.node.attributes[i];
                        if (attribute.name !== 'media' &&
                            (attribute.name !== 'rel' || attribute.value !== 'stylesheet') &&
                            (attribute.name !== 'href' || incomingRelation.node.nodeName.toLowerCase() !== 'link') &&
                            (attribute.name !== 'type' || attribute.value !== 'text/css')) {

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
