module.exports = function (options) {
    options = options || {};

    var externalImportQuery = options.relationQuery || {
        crossorigin: true,
        type: ['HtmlScript', 'HtmlStyle']
    };

    var importPathName = options.importPath || 'external-imports';

    return function importExternalAssets(assetGraph) {
        return assetGraph
            .populate(externalImportQuery)
            .queue(function moveExternalAssetsInternal(assetGraph) {
                assetGraph.findRelations(externalImportQuery).forEach(function (relation) {
                    var to = relation.to;

                    if (to.url) {
                        relation.hrefType = 'rootRelative';
                        to.url = assetGraph.root + [importPathName, to.fileName.replace(to.extension, '-' + to.id + to.extension)].join('/');
                    }
                });
            });
    };
};
