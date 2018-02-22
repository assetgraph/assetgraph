const childProcess = require('child_process');
const Promise = require('bluebird');

module.exports = (queryObj, version) => {
  return async function addDataVersionAttributeToHtmlElement(assetGraph) {
    if (typeof version === 'undefined') {
      // Try to derive a version tag from git:
      try {
        const [stdout] = await Promise.fromNode(
          cb =>
            childProcess.exec(
              'git describe --long --tags --always --dirty',
              cb
            ),
          { multiArgs: true }
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
