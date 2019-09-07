const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlKnockoutContainerless', function() {
  it('should handle a test case with existing <!-- ko ... --> comments', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlKnockoutContainerless/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 2);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain relation', 'HtmlKnockoutContainerless');

    const javaScript = assetGraph.findAssets({
      type: 'JavaScript',
      isInline: true
    })[0];
    javaScript.parseTree.body[0].expression.properties.push({
      type: 'Property',
      key: { type: 'Identifier', name: 'yup' },
      value: { type: 'Literal', value: 'yup', raw: "'yup'" }
    });
    javaScript.markDirty();

    expect(assetGraph.findAssets({ type: 'Html' })[0].text, 'to match', /yup/);
  });
});
