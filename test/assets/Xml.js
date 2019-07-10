const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Xml', function() {
  it('should handle a test case with an existing Xml asset', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/assets/Xml/')
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain assets', 2);
    expect(assetGraph, 'to contain asset', 'Xml');

    const xml = assetGraph.findAssets({ type: 'Xml' })[0];
    expect(
      xml.parseTree.getElementsByTagName('Description'),
      'to have property',
      'length',
      1
    );

    xml.parseTree
      .getElementsByTagName('Description')[0]
      .setAttribute('yay', 'foobarquux');
    xml.markDirty();
    expect(xml.text, 'to match', /foobarquux/);
  });

  it('should parse a document without an XML declaration', function() {
    // eg. svgo omits this
    const xmlAsset = new AssetGraph().addAsset({
      type: 'Xml',
      url: 'https://example.com/',
      text: '<doc />\n'
    });
    expect(() => xmlAsset.parseTree, 'not to throw');
  });

  describe('#text', function() {
    describe('when the original document included an XML declaration', function() {
      it('should include the XML declaration when reserializing', function() {
        const xmlAsset = new AssetGraph().addAsset({
          type: 'Xml',
          url: 'https://example.com/',
          text: '<?xml version="1.0" encoding="UTF-8"?>\n<doc />'
        });
        xmlAsset.parseTree; // eslint-disable-line no-unused-expressions
        xmlAsset.markDirty();
        expect(
          xmlAsset.text,
          'to equal',
          '<?xml version="1.0" encoding="UTF-8"?>\n<doc/>\n'
        );
      });
    });

    describe('when the original document did not include an XML declaration', function() {
      it('should not include an XML declaration when reserializing', function() {
        const xmlAsset = new AssetGraph().addAsset({
          type: 'Xml',
          url: 'https://example.com/',
          text: '<doc />'
        });
        xmlAsset.parseTree; // eslint-disable-line no-unused-expressions
        xmlAsset.markDirty();
        expect(xmlAsset.text, 'to equal', '<doc/>\n');
      });
    });
  });
});
