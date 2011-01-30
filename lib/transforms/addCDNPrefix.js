exports.addCDNPrefix = function addCDNPrefix(prefix) {
    return function (assetGraph, cb) {
        assetGraph.relations.forEach(function (relation) {
            if (relation.to.url &&
                relation.type === 'CSSBackgroundImage' ||
                relation.type === 'HTMLShortcutIcon' ||
                relation.type === 'HTMLImage' ||
                relation.type === 'HTMLScript' ||
                relation.type === 'HTMLStyle') {

                relation._setRawUrlString(prefix + relation.to.url);
            }
        });
        process.nextTick(cb);
    };
};
