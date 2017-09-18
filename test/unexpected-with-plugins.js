module.exports = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .use(require('unexpected-dom'))
    .use(require('./unexpectedAssetGraph'))
    .use(require('magicpen-prism'));
