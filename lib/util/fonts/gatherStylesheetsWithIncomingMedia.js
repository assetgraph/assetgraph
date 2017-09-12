module.exports = function gatherStylesheetsWithIncomingMedia(assetGraph, htmlAsset) {
    var assetStack = [];
    var incomingMedia = [];
    var result = [];
    (function traverse(asset) {
        if (assetStack.indexOf(asset) !== -1) {
            // Cycle detected
            return;
        } else if (!asset.isLoaded) {
            return;
        }
        assetStack.push(asset);
        assetGraph.findRelations({ from: asset, type: ['HtmlStyle', 'CssImport']}).forEach(function (relation) {
            var media = relation.media;
            if (media) {
                incomingMedia.push(media);
            }
            traverse(relation.to);
            if (media) {
                incomingMedia.pop();
            }
        });
        assetStack.pop();
        if (asset.type === 'Css') {
            result.push({ text: asset.text, incomingMedia: [].concat(incomingMedia)});
        }
    }(htmlAsset));

    return result;
};
