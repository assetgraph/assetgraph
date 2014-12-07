module.exports = require('unexpected')
    .clone()
    .installPlugin(require('unexpected-sinon'))
    .installPlugin(require('unexpected-jsdom'))
    .installPlugin(require('./unexpectedAssetGraph'));
