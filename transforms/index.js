['addFsLabelResolvers',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifest',
 'findAssetSerializationOrder',
 'checkRelationConsistency',
 'bundleRelations',
 'spriteBackgroundImages',
 'addPNG8FallbackForIE6'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
