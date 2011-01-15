['addLabelResolversToFsLoader',
 'flattenStaticIncludes',
 'dumpGraph',
 'addCDNPrefix'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
