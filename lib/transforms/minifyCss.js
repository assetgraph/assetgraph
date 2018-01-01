const cssnano = require('cssnano');

const defaultQueryObj = {type: 'Css', isLoaded: true};

module.exports = queryObj => {
    return async assetGraph => {
        if (queryObj) {
            queryObj = assetGraph.query.and(queryObj, defaultQueryObj);
        } else {
            queryObj = defaultQueryObj;
        }
        for (const cssAsset of assetGraph.findAssets(queryObj)) {
            try {
                const result = await cssnano.process(cssAsset.parseTree, undefined, {
                    preset: [
                        'default',
                        {
                            svgo: false,
                            discardComments: {
                                remove(comment) {
                                    return !(/@preserve|@license|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment);
                                }
                            }
                        }
                    ]
                });
                cssAsset.parseTree = result.root;
            } catch (err) {
                assetGraph.warn(err);
            }
        }
    };
};
