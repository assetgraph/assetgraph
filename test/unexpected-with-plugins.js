module.exports = require('unexpected')
    .clone()
    .installPlugin(require('unexpected-sinon'))
    .installPlugin(require('unexpected-dom'))
    .installPlugin(require('unexpected-mitm'))
    .installPlugin(require('./unexpectedAssetGraph'));
