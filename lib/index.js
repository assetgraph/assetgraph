['relations', 'assets', 'AssetGraph', 'JavaScriptLoader'].forEach(function (moduleName) {
    exports[moduleName] = require('./' + moduleName);
});
