['moveAssetsToStaticDir',
 'registerLabelsAsCustomProtocols',
 'minifyAssets',
 'populate',
 'executeJavaScriptIfEnvironment',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifestSinglePage',
 'addCacheManifestSiteMap',
 'checkRelationConsistency',
 'bundleRelations',
 'spriteBackgroundImages',
 'addPNG8FallbackForIE6',
 'writeAssetsToDisc'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
