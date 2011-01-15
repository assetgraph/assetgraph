['addLabelResolversToFsLoader',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifest',
 'findAssetSerializationOrder',
 'checkRelationConsistency'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
