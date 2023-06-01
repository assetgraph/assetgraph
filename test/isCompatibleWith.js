const AssetGraph = require('../lib/AssetGraph');
const expect = require('./unexpected-with-plugins');

describe('isCompatibleWith', function () {
  it('should consider Css compatible with Asset', function () {
    const assetGraph = new AssetGraph();
    const asset = assetGraph.addAsset({ type: 'Css', text: '' });
    expect(assetGraph._isCompatibleWith(asset, undefined), 'to be true');
  });

  it('should consider Atom compatible with Xml', function () {
    const assetGraph = new AssetGraph();
    const asset = assetGraph.addAsset({
      type: 'Atom',
      text: '<?xml version="1.0" encoding="utf-8"?><foo></foo>',
    });
    expect(assetGraph._isCompatibleWith(asset, 'Xml'), 'to be true');
  });

  it('should consider Xml compatible with Atom', function () {
    const assetGraph = new AssetGraph();
    const asset = assetGraph.addAsset({
      type: 'Xml',
      text: '<?xml version="1.0" encoding="utf-8"?><foo></foo>',
    });
    expect(assetGraph._isCompatibleWith(asset, 'Atom'), 'to be true');
  });

  it('should consider Css incompatible with JavaScript', function () {
    const assetGraph = new AssetGraph();
    const asset = assetGraph.addAsset({ type: 'Css', text: '' });
    expect(assetGraph._isCompatibleWith(asset, 'JavaScript'), 'to be false');
  });
});
