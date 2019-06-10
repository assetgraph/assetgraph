const types = Object.freeze({
  ABSOLUTE: 'absolute',
  PROTOCOL_RELATIVE: 'protocolRelative',
  ROOT_RELATIVE: 'rootRelative',
  RELATIVE: 'relative',
  INLINE: 'inline',
});

exports.hrefTypes = types;

/**
 * @argument {string} inputHref
 * @returns {string}
 */
exports.getHrefType = function getHrefType(inputHref) {
  if (!inputHref) {
    return types.RELATIVE;
  }

  const href = inputHref.trim();

  if (href.startsWith('//')) {
    return types.PROTOCOL_RELATIVE;
  } else if (href.startsWith('/')) {
    return types.ROOT_RELATIVE;
  // } else if (href.startsWith('data:')) {
  //   return types.INLINE;
  } else if (/^[a-z+]+:/i.test(href)) {
    return types.ABSOLUTE;
  }

  return types.RELATIVE;
}
