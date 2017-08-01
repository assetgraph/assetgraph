module.exports = queryObj => {
    return function convertCssImportsToHtmlStyles(assetGraph) {
        for (const htmlAsset of assetGraph.findAssets(Object.assign({type: 'Html'}, queryObj))) {
            for (const htmlStyle of assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset})) {
                assetGraph.eachAssetPostOrder(htmlStyle, {type: 'CssImport'}, (cssAsset, incomingRelation) => {
                    if (incomingRelation.type === 'CssImport') {
                        const newHtmlStyle = htmlAsset.addRelation({
                            type: 'HtmlStyle',
                            hrefType: incomingRelation.hrefType,
                            to: cssAsset
                        }, 'before', htmlStyle);
                        // FIXME: Support media attribute when creating HtmlStyle
                        const media = incomingRelation.media;
                        if (media.length) {
                            newHtmlStyle.node.setAttribute('media', media);
                        }
                        incomingRelation.detach();
                    }
                });
            }
        }
    };
};
