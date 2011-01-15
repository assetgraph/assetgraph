['addLabelResolversToFsLoader', 'flattenStaticIncludes', 'dumpGraph'].forEach(function (transformName) {
    exports[transformName] = require('./' + transformName)[transformName];
});
