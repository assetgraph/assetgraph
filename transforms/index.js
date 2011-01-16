['addLabelResolversToFsLoader',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifest',
 'findAssetSerializationOrder',
 'checkRelationConsistency',
 'bundleRelations',
 'spriteBackgroundImages'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
