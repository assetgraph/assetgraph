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
            const result = await cssnano.process(cssAsset.parseTree, undefined, {
                preset: [
                    'default',
                    {
                        svgo: false,
                        safe: true,
                        normalizeUrl: false, // Buggy
                        mergeLonghand: false,
                        autoprefixer: false,
                        discardComments: {
                            remove(comment) {
                                return !(/@preserve|@license|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment);
                            }
                        }
                    }
                ]
            });
            cssAsset.parseTree = result.root;
        }
    };
};
