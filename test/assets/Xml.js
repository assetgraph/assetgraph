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
          '<?xml version="1.0" encoding="UTF-8"?>\n<doc/>'
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
        expect(xmlAsset.text, 'to equal', '<doc/>');
      });
    });
  });

  describe('#minify', function() {
    it('should include the XML declaration when reserializing', function() {
      const xmlAsset = new AssetGraph().addAsset({
        type: 'Xml',
        url: 'https://example.com/',
        text:
          '<?xml version="1.0" encoding="UTF-8"?>\n<doc>  <foo>  </foo>  </doc>'
      });
      xmlAsset.minify();
      expect(
        xmlAsset.text,
        'to equal',
        '<?xml version="1.0" encoding="UTF-8"?>\n<doc><foo/></doc>'
      );
    });
  });

  describe('with a non-UTF-8 encoding', function() {
    it('should parse the document correctly', function() {
      const xmlAsset = new AssetGraph().addAsset({
        type: 'Xml',
        url: 'https://example.com/',
        rawSrc: Buffer.concat([
          Buffer.from('<?xml version="1.0" encoding="windows-1252"?>\n<doc>'),
          Buffer.from([0xf8]),
          Buffer.from('</doc>')
        ])
      });
      expect(
        xmlAsset.parseTree.firstChild.firstChild.nodeValue,
        'to equal',
        'ø'
      );
    });

    describe('that uses non-space whitespace in the xml declaration', function() {
      it('should parse the document correctly', function() {
        const xmlAsset = new AssetGraph().addAsset({
          type: 'Xml',
          url: 'https://example.com/',
          rawSrc: Buffer.concat([
            Buffer.from(
              '<?xml\tversion="1.0"\tencoding="windows-1252"?>\n<doc>'
            ),
            Buffer.from([0xf8]),
            Buffer.from('</doc>')
          ])
        });
        expect(
          xmlAsset.parseTree.firstChild.firstChild.nodeValue,
          'to equal',
          'ø'
        );
      });
    });

    it('should reserialize the document correctly', function() {
      const xmlAsset = new AssetGraph().addAsset({
        type: 'Xml',
        url: 'https://example.com/',
        rawSrc: Buffer.concat([
          Buffer.from('<?xml version="1.0" encoding="windows-1252"?>\n<doc>'),
          Buffer.from([0xf8]),
          Buffer.from('</doc>')
        ])
      });
      // eslint-disable-next-line no-unused-expressions
      xmlAsset.parseTree;
      xmlAsset.markDirty();
      expect(xmlAsset.text, 'to contain', 'encoding="windows-1252"');
      expect(xmlAsset.rawSrc.includes(Buffer.from([0xf8])), 'to be true');
    });
  });

  describe('when explicitly updating the encoding', function() {
    describe('from an existing explicit encoding in the xml declaration', function() {
      it('should reserialize the document correctly', function() {
        const xmlAsset = new AssetGraph().addAsset({
          type: 'Xml',
          url: 'https://example.com/',
          text: '<?xml version="1.0" encoding="utf-8"?>\n<doc>ø</doc>'
        });
        // eslint-disable-next-line no-unused-expressions
        xmlAsset.parseTree;
        xmlAsset.markDirty();
        xmlAsset.encoding = 'windows-1252';
        expect(
          xmlAsset.rawSrc.includes(
            Buffer.from('<?xml version="1.0" encoding="windows-1252"?>')
          ),
          'to be true'
        );
        expect(xmlAsset.rawSrc.includes(Buffer.from([0xf8])), 'to be true');
        expect(
          xmlAsset.text,
          'to contain',
          '<?xml version="1.0" encoding="windows-1252"?>'
        );
      });

      describe('that had a non-space whitespace character', function() {
        it('should reserialize the document correctly', function() {
          const xmlAsset = new AssetGraph().addAsset({
            type: 'Xml',
            url: 'https://example.com/',
            text: '<?xml version="1.0"\rencoding="utf-8"?>\n<doc>ø</doc>'
          });
          // eslint-disable-next-line no-unused-expressions
          xmlAsset.parseTree;
          xmlAsset.markDirty();
          xmlAsset.encoding = 'windows-1252';
          expect(
            xmlAsset.rawSrc.includes(
              Buffer.from('<?xml version="1.0" encoding="windows-1252"?>')
            ),
            'to be true'
          );
          expect(xmlAsset.rawSrc.includes(Buffer.from([0xf8])), 'to be true');
          expect(
            xmlAsset.text,
            'to contain',
            '<?xml version="1.0" encoding="windows-1252"?>'
          );
        });
      });
    });

    describe('with no existing encoding attribute', function() {
      it('should reserialize the document correctly', function() {
        const xmlAsset = new AssetGraph().addAsset({
          type: 'Xml',
          url: 'https://example.com/',
          text: '<?xml version="1.0"?>\n<doc>ø</doc>'
        });
        // eslint-disable-next-line no-unused-expressions
        xmlAsset.parseTree;
        xmlAsset.markDirty();
        xmlAsset.encoding = 'windows-1252';
        expect(
          xmlAsset.rawSrc.includes(Buffer.from('encoding="windows-1252"')),
          'to be true'
        );
        expect(xmlAsset.rawSrc.includes(Buffer.from([0xf8])), 'to be true');
        expect(xmlAsset.text, 'to contain', 'encoding="windows-1252"');
      });
    });

    describe('with no existing XML declaration', function() {
      it('should add an XML declaration and reserialize the document correctly', function() {
        const xmlAsset = new AssetGraph().addAsset({
          type: 'Xml',
          url: 'https://example.com/',
          text: '<doc>ø</doc>'
        });
        // eslint-disable-next-line no-unused-expressions
        xmlAsset.parseTree;
        xmlAsset.markDirty();
        xmlAsset.encoding = 'windows-1252';
        expect(
          xmlAsset.xmlDeclaration,
          'to equal',
          '<?xml version="1.0" encoding="windows-1252"?>'
        );
        expect(
          xmlAsset.rawSrc.includes(Buffer.from('encoding="windows-1252"')),
          'to be true'
        );
        expect(xmlAsset.rawSrc.includes(Buffer.from([0xf8])), 'to be true');
        expect(
          xmlAsset.text,
          'to contain',
          '<?xml version="1.0" encoding="windows-1252"?>'
        );
      });
    });
  });
});
