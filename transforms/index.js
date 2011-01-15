['addLabelResolversToFsLoader',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifest'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
