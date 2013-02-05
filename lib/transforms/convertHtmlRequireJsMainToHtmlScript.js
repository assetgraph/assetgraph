var _ = require('underscore');

module.exports = function (queryObj) {
    return function (assetGraph) {
        assetGraph.findRelations(_.extend({type: 'HtmlRequireJsMain'}, queryObj)).forEach(function (htmlRequireJsMain) {
            var outgoingRelations = assetGraph.findRelations({from: htmlRequireJsMain.to});
            outgoingRelations.forEach(function (outgoingRelation) {
                assetGraph.removeRelation(outgoingRelation);
            });
            var newIncomingRelation = new assetGraph.HtmlScript({
                to: htmlRequireJsMain.to
            });
            newIncomingRelation.attach(htmlRequireJsMain.from, 'after', htmlRequireJsMain);
            htmlRequireJsMain.detach();
            outgoingRelations.forEach(function (outgoingRelation) {
                assetGraph.addRelation(outgoingRelation);
                outgoingRelation.refreshHref();
            });
        });
        assetGraph.recomputeBaseAssets();
    };
};
