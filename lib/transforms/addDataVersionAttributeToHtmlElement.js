const childProcess = require('child_process');
const { promisify } = require('util');

module.exports = (queryObj, version) => {
  return async function addDataVersionAttributeToHtmlElement(assetGraph) {
    if (typeof version === 'undefined') {
      // Try to derive a version tag from git:
      try {
        const rawVersion = await promisify(cb =>
          childProcess.exec(
            'git describe --long --tags --always --dirty',
            {
              encoding: 'utf-8'
            },
            cb
          )
        )();
        version = rawVersion.replace(/^[\s\n\r]+|[\s\r\n]+$/g, '');
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
