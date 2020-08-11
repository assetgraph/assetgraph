const fakeNamespaceUrl = 'http://fake';
const fakeNamespaceMatcher = new RegExp(
  ` xmlns:[^=]+="${fakeNamespaceUrl}"`,
  'g'
);

/**
 * @param {string} xmlSource
 */
function addMissingNamespaces(xmlSource) {
  const usedNamespaceMatches = xmlSource.match(
    /[< \t^][a-z]+:[a-z]+\b|[ \t^][a-z]+:[a-z]+\s*=/g
  );
  const usedNamespaces = (usedNamespaceMatches || [])
    .map((str) => str.match(/[a-z]+/)[0])
    .filter((str) => !['xml', 'xmlns', 'svg'].includes(str));

  if (usedNamespaces.length === 0) {
    return xmlSource;
  }

  const missingNamespaces = usedNamespaces.filter(
    (ns) => !xmlSource.includes(`xmlns:${ns}`)
  );
  const injectedSource = missingNamespaces
    .map((ns) => `xmlns:${ns}="${fakeNamespaceUrl}"`)
    .join(' ');

  return xmlSource.replace('<svg', `<svg ${injectedSource}`);
}

/**
 * @param {string} xmlSource
 */
function removeAddedNamespaces(xmlSource) {
  return xmlSource.replace(fakeNamespaceMatcher, '');
}

module.exports = { addMissingNamespaces, removeAddedNamespaces };
