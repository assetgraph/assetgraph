const Module = require('module');
const Path = require('path');

function resolveCommonJsModuleName(baseFileName, moduleName) {
  const fakeModule = new Module(baseFileName);
  fakeModule.filename = baseFileName;
  fakeModule.paths = Module._nodeModulePaths(Path.dirname(fakeModule.filename));
  let resolvedCommonJsModuleName;
  try {
    resolvedCommonJsModuleName = Module._resolveFilename(
      moduleName,
      fakeModule
    );
  } catch (e) {
    return;
  }
  if (Array.isArray(resolvedCommonJsModuleName)) {
    resolvedCommonJsModuleName = resolvedCommonJsModuleName[0]; // Node 0.4?
  }
  return resolvedCommonJsModuleName;
}

module.exports = resolveCommonJsModuleName;
