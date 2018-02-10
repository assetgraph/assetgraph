const unquote = require('./unquote');

function getGoogleIdForFontProps(fontProps) {
  const family = unquote(
    fontProps['font-family'].split(',')[0].replace(' ', '+')
  );

  const weight = fontProps['font-weight'];

  const italic = fontProps['font-style'] === 'italic';

  return [family, ':', weight, italic ? 'i' : ''].join('');
}

module.exports = getGoogleIdForFontProps;
