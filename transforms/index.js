['addLabelResolversToFsLoader',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifest',
 'findAssetSerializationOrder',
 'checkRelationConsistency',
 'bundleRelations'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
