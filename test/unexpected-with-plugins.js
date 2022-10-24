module.exports = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-dom'))
  .use(require('unexpected-assetgraph'))
  .use(require('magicpen-prism'));
