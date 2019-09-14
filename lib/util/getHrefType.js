const types = Object.freeze({
  ABSOLUTE: 'absolute',
  PROTOCOL_RELATIVE: 'protocolRelative',
  ROOT_RELATIVE: 'rootRelative',
  RELATIVE: 'relative',
  INLINE: 'inline'
});

exports.hrefTypes = types;

/**
 * @typedef {'absolute' | 'protocolRelative' | 'rootRelative' | 'relative' | 'inline'} HrefType
 */

/**
 * @argument {string} inputHref
 * @returns {HrefType}
 */
exports.getHrefType = function getHrefType(inputHref) {
  const href = inputHref.trim();

  if (href.startsWith('//')) {
    return /** @type {HrefType} */ (types.PROTOCOL_RELATIVE);
  } else if (href.startsWith('/')) {
    return /** @type {HrefType} */ (types.ROOT_RELATIVE);
  } else if (href.startsWith('data:')) {
    return /** @type {HrefType} */ (types.INLINE);
  } else if (/^[a-z+]+:/i.test(href)) {
    return /** @type {HrefType} */ (types.ABSOLUTE);
  }

  return /** @type {HrefType} */ (types.RELATIVE);
};
