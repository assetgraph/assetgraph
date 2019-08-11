const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/addDataVersionAttributeToHtmlElement', function() {
  it('should add the specified data-version tag', async function() {
    const assetGraph = new AssetGraph();

    assetGraph.addAsset(
      new AssetGraph().addAsset({
        type: 'Html',
        url: 'http://example.com/index.html',
        text: '<!DOCTYPE html><html><head></head><body></body></html>'
      })
    );

    await assetGraph.addDataVersionAttributeToHtmlElement(
      { type: 'Html' },
      'theDataVersionTag'
    );

    expect(
      assetGraph.findAssets({ url: 'http://example.com/index.html' })[0].text,
      'to contain',
      '<!DOCTYPE html><html data-version="theDataVersionTag"><head></head><body></body></html>'
    );
  });

  it('should use git-describe to retrieve a suitable version tag if none is given', async function() {
    const assetGraph = new AssetGraph();

    assetGraph.addAsset(
      new AssetGraph().addAsset({
        type: 'Html',
        url: 'http://example.com/index.html',
        text: '<!DOCTYPE html><html><head></head><body></body></html>'
      })
    );

    await assetGraph.addDataVersionAttributeToHtmlElement({ type: 'Html' });

    expect(
      assetGraph.findAssets({ url: 'http://example.com/index.html' })[0].text,
      'to contain',
      '<!DOCTYPE html><html data-version="'
    );
  });
});
