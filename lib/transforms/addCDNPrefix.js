exports.addCDNPrefix = function (prefix) {
    return function addCDNPrefix(assetGraph, cb) {
        assetGraph.findRelations({
            type: ['CSSBackgroundImage', 'HTMLShortcutIcon', 'HTMLImage', 'HTMLScript', 'HTMLStyle']
        }).forEach(function (relation) {
            if (relation.to.url) {
                relation._setRawUrlString(prefix + relation.to.url);
            }
        });
        process.nextTick(cb);
    };
};
