var Module = require('module'),
    Path = require('path');

function resolveCommonJsModuleName(baseFileName, moduleName) {
    var fakeModule = new Module(baseFileName);
    fakeModule.filename = baseFileName;
    fakeModule.paths = Module._nodeModulePaths(Path.dirname(fakeModule.filename));
    var resolvedCommonJsModuleName;
    try {
        resolvedCommonJsModuleName = Module._resolveFilename(moduleName, fakeModule);
    } catch (e) {
        return;
    }
    if (Array.isArray(resolvedCommonJsModuleName)) {
        resolvedCommonJsModuleName = resolvedCommonJsModuleName[0]; // Node 0.4?
    }
    return resolvedCommonJsModuleName;
}

module.exports = resolveCommonJsModuleName;
