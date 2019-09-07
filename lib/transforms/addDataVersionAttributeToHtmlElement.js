const childProcess = require('child_process');
const { promisify } = require('util');
const exec = promisify(childProcess.exec);

module.exports = (queryObj, version) => {
  return async function addDataVersionAttributeToHtmlElement(assetGraph) {
    if (typeof version === 'undefined') {
      // Try to derive a version tag from git:
      try {
        const { stdout } = await exec(
          'git describe --long --tags --always --dirty',
          {
            encoding: 'utf-8'
          }
        );
        version = stdout.replace(/^[\s\n\r]+|[\s\r\n]+$/g, '');
      } catch (e) {}
    }
    if (version) {
      for (const htmlAsset of assetGraph.findAssets(
        Object.assign({ type: 'Html' }, queryObj)
      )) {
        const documentElement = htmlAsset.parseTree.documentElement;
        if (documentElement) {
          documentElement.setAttribute(
            'data-version',
            version.replace(
              /\{0\}/g,
              documentElement.getAttribute('data-version') || ''
            )
          );
          htmlAsset.markDirty();
        }
      }
    }
  };
};
