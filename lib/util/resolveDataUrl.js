const parseDataUrl = require('data-urls');
/** @typedef {import('../assets/Asset').AssetConfig} AssetConfig */

/**
 * @param {string} dataUrl
 */
module.exports = function resolveDataUrl(dataUrl) {
  try {
    const result = parseDataUrl(dataUrl);

    /** @type {AssetConfig} */
    const assetConfig = {
      contentType: result.mimeType.essence,
      encoding: result.mimeType.parameters.get('charset') || 'utf-8',
      rawSrc: result.body
    };

    return assetConfig;
  } catch (err) {
    return null;
  }
};
