['moveAssetsToStaticDir',
 'registerLabelsAsCustomProtocols',
 'populate',
 'executeJavaScriptIfEnvironment',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix',
 'addCacheManifest',
 'checkRelationConsistency',
 'bundleRelations',
 'spriteBackgroundImages',
 'addPNG8FallbackForIE6',
 'writeAssetsToDisc'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
