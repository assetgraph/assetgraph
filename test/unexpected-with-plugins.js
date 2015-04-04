var expect = require('unexpected')
    .clone()
    .installPlugin(require('unexpected-sinon'))
    .installPlugin(require('unexpected-dom'))
    .installPlugin(require('./unexpectedAssetGraph'));

expect.output.installPlugin(require('magicpen-prism'));

module.exports = expect;
