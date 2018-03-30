const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');
const httpception = require('httpception');
const fs = require('fs');

describe('assets/Asset', function() {
  describe('#load()', function() {
    it('should error when there is no file handle and the asset is not in a graph', function() {
      const asset = new AssetGraph().addAsset({});

      return expect(asset.load(), 'to be rejected');
    });

    it('should autodetect the type of an asset with an unrecognizable file extension', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/autodetectTypeWhenExtensionIsUnknown/'
        )
      });

      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain asset', 'Svg');
    });

    it('should complain if no Content-Type response header is received', async function() {
      const assetGraph = new AssetGraph();
      const warnSpy = sinon.spy();
      assetGraph.on('warn', warnSpy);

      httpception({
        request: 'GET https://www.example.com/foo.js',
        response: {
          body: 'alert("foo");'
        }
      });

      await assetGraph.loadAssets('https://www.example.com/foo.js');

      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy('No Content-Type response header received');
      });
    });

    it('should complain if an unparsable Content-Type response header is received', async function() {
      const assetGraph = new AssetGraph();
      const warnSpy = sinon.spy();
      assetGraph.on('warn', warnSpy);

      httpception({
        request: 'GET https://www.example.com/foo.js',
        response: {
          headers: {
            'Content-Type': 'foo!$bar'
          },
          body: 'alert("foo");'
        }
      });

      await assetGraph.loadAssets('https://www.example.com/foo.js');

      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy('Invalid Content-Type response header received: foo!$bar');
      });
    });

    it('should warn if the Content-Type of the asset contradicts the incoming relations', async function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://www.example.com/',
        text: `
          <!DOCTYPE html>
          <html>
              <head></head>
              <body>
                  <script src="foo.js"></script>
              </body>
          </html>
        `
      });

      httpception({
        request: 'GET https://www.example.com/foo.js',
        response: {
          headers: {
            'Content-Type': 'image/png'
          },
          body: 'alert("foo");'
        }
      });
      const warnSpy = sinon.spy();
      assetGraph.on('warn', warnSpy);
      await htmlAsset.outgoingRelations[0].to.load();
      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy('Asset is used as both JavaScript and Png');
      });
    });

    it('should warn if the Content-Type is text/plain when expecting a specific Text subclass', async function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://www.example.com/',
        text: `
          <!DOCTYPE html>
          <html>
              <head></head>
              <body>
                  <script src="foo.js"></script>
              </body>
          </html>
        `
      });

      httpception({
        request: 'GET https://www.example.com/foo.js',
        response: {
          headers: {
            'Content-Type': 'text/plain'
          },
          body: 'alert("foo");'
        }
      });
      const warnSpy = sinon.spy();
      assetGraph.on('warn', warnSpy);
      await htmlAsset.outgoingRelations[0].to.load();
      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy('Asset is used as both JavaScript and Text');
      });
    });

    it('should not complain about a SourceMap being served as application/json', async function() {
      httpception([
          {
              request: 'GET https://example.com/styles.css',
              response: {
                  headers: {
                      'Content-Type': 'text/css'
                  },
                  body: 'div { color: maroon; }/*#sourceMappingURL=css.map*/'
              }
          },
          {
              request: 'GET https://example.com/css.map',
              response: {
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: {
                      version: 3,
                      sources: [ '/a.less' ],
                      names: [],
                      mappings: 'AAAA;EACE,eAAe;EACf,sBAAsB;CACvB;AACD;EACE,+CAA+C;EAC/C,uCAAuC;CACxC',
                      file: 'styles.css'
                  }
              }
          }
      ]);
      const assetGraph = new AssetGraph();
      const warnSpy = sinon.spy();
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('https://example.com/styles.css');
      await assetGraph.populate({
        followRelations: {type: 'CssSourceMappingUrl'}
      });
      expect(warnSpy, 'was not called');
    });
  });

  describe('#addRelation()', function() {
    it('should implicitly create a non-inline target asset and add it to the graph', function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        url: 'http://example.com/',
        type: 'Html',
        text: ''
      });
      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          to: {
            url: 'http://example.com/script.js',
            type: 'JavaScript',
            text: 'alert("foo")'
          }
        },
        'last'
      );
      expect(assetGraph, 'to contain asset', {
        isLoaded: true,
        url: 'http://example.com/script.js'
      });
    });

    it('should implicitly create an inline target asset and add it to the graph', function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        url: 'http://example.com/',
        type: 'Html',
        text: ''
      });
      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            text: "alert('foo');"
          }
        },
        'last'
      );
      expect(assetGraph, 'to contain asset', {
        type: 'JavaScript',
        isInline: true,
        text: "alert('foo');"
      });
      expect(htmlAsset.text, 'to equal', "<script>alert('foo');</script>");
    });

    it('should implicitly create an inline target asset with outgoing relations and add it to the graph', function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        url: 'http://example.com/',
        type: 'Html',
        text: ''
      });
      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          to: {
            type: 'JavaScript',
            text: 'alert("/thatimage.gif".toString("url"))'
          }
        },
        'last'
      );
      expect(assetGraph, 'to contain asset', { fileName: 'thatimage.gif' });
    });

    it('should add and attach a relation that does not already have a node', function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        url: 'http://example.com/',
        type: 'Html',
        text: ''
      });
      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          to: {
            url: 'http://example.com/script.js',
            type: 'JavaScript',
            text: 'alert("foo")'
          }
        },
        'last'
      );
      expect(htmlAsset.text, 'to equal', '<script src="script.js"></script>');
    });

    it('should use the passed node instead of creating a new one', function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        url: 'http://example.com/',
        type: 'Html',
        text: '<div>foobar</div>'
      });
      const node = htmlAsset.parseTree.createElement('script');
      htmlAsset.parseTree.querySelector('div').appendChild(node);
      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          node,
          to: {
            url: 'http://example.com/script.js',
            type: 'JavaScript',
            text: 'alert("foo")'
          }
        },
        'last'
      );
      expect(
        htmlAsset.text,
        'to equal',
        '<div>foobar<script src="script.js"></script></div>'
      );
    });
  });

  describe('#fileName', function() {
    it('should come out as undefined when the url ends with a slash initially', function() {
      expect(
        new AssetGraph().addAsset({
          type: 'Html',
          text: 'foo',
          url: 'https://example.com/'
        }).fileName,
        'to be undefined'
      );
    });

    it('should come out as undefined when an inline asset is externalized to a url that ends with a slash', function() {
      const assetGraph = new AssetGraph();
      const cssAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/',
        text: '<style>/**/</style>'
      }).outgoingRelations[0].to;
      cssAsset.url = 'https://example.com/styles/';
      expect(cssAsset.fileName, 'to be undefined');
    });

    it('should update _baseName and _extension', function() {
      const assetGraph = new AssetGraph();
      const cssAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/foo.bar.html',
        text: '<style>/**/</style>'
      }).outgoingRelations[0].to;
      cssAsset.fileName = 'baz.quux.html';
      expect(cssAsset._baseName, 'to equal', 'baz.quux');
      expect(cssAsset._extension, 'to equal', '.html');
    });
  });

  it('should handle an asset with an extensionless url', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index'
    });

    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', 'index');

    htmlAsset.extension = '.foo';

    expect(htmlAsset.extension, 'to equal', '.foo');
    expect(htmlAsset.fileName, 'to equal', 'index.foo');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.foo');

    htmlAsset.url = 'http://anotherexample.com/heythere.dhtml';

    expect(htmlAsset, 'to have properties', {
      extension: '.dhtml',
      fileName: 'heythere.dhtml'
    });

    htmlAsset.url = null;

    // The extension and fileName properties should still have the previous value
    expect(htmlAsset, 'to have properties', {
      extension: '.dhtml',
      fileName: 'heythere.dhtml'
    });
  });

  it('should handle another Html asset with an extensionless url', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'æøå',
      url: 'http://example.com/index'
    });

    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', 'index');
    expect(htmlAsset.lastKnownByteLength, 'to equal', 6);

    htmlAsset.fileName = 'thething.foo';

    expect(htmlAsset.extension, 'to equal', '.foo');
    expect(htmlAsset.fileName, 'to equal', 'thething.foo');
    expect(htmlAsset.url, 'to equal', 'http://example.com/thething.foo');

    htmlAsset.unload();
    expect(htmlAsset.lastKnownByteLength, 'to equal', 6);
  });

  it('should handle an Html asset with an url that has an extension', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      rawSrc: new Buffer([0xc3, 0xa6, 0xc3, 0xb8, 0xc3, 0xa5]),
      url: 'http://example.com/index.blah'
    });

    expect(htmlAsset.lastKnownByteLength, 'to equal', 6);
    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');

    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg');

    htmlAsset.rawSrc = new Buffer('foo', 'utf-8');

    expect(htmlAsset.lastKnownByteLength, 'to equal', 3);
  });

  it('should handle another Html asset with an url that has an extension', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah'
    });

    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.fileName = 'index.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg');
  });

  it('should handle yet another Html asset with an url that has an extension', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah'
    });
    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.extension = '';
    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', 'index');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index');
  });

  it('should yet yet another Html asset with an url that has an extension', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah'
    });

    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.fileName = '';
    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', '');
    expect(htmlAsset.url, 'to equal', 'http://example.com/');
  });

  it('should handle an Html asset with an url that has an extension and a fragment identifier', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah#yay'
    });
    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg');
    htmlAsset.extension = '';
    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', 'index');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index');
  });

  it('should handle another Html asset with an url that has an extension and a fragment identifier', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah#yay'
    });
    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg');
  });

  it('should handle an Html asset with an url that has an extension and a query string', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah?yay=bar'
    });

    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar');
    htmlAsset.extension = '';
    expect(htmlAsset.fileName, 'to equal', 'index');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index?yay=bar');
  });

  it('should handle another Html asset with an url that has an extension and a query string', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah?yay=bar'
    });

    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.fileName = 'index.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar');
  });

  it('should handle an Html asset with an url that has an extension, a query string, and a fragment identifier', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah?yay=bar#really'
    });
    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar');
    htmlAsset.extension = '';
    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', 'index');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index?yay=bar');
  });

  it('should handle an Html asset with an url that has an extension, a query string, and a fragment identifier', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://example.com/index.blah?yay=bar'
    });
    expect(htmlAsset.extension, 'to equal', '.blah');
    expect(htmlAsset.fileName, 'to equal', 'index.blah');
    htmlAsset.fileName = 'index.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'index.blerg');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index.blerg?yay=bar');
    htmlAsset.extension = '';
    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', 'index');
    expect(htmlAsset.url, 'to equal', 'http://example.com/index?yay=bar');
  });

  it('should handle an Html asset with no url (should make one up)', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      text: 'foo'
    });
    expect(htmlAsset.extension, 'to equal', '.html');
    expect(htmlAsset.fileName, 'to match', /\d+\.html$/);
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
  });

  it('should handle an Html asset with no url, but an extension of ".yay"', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      extension: '.yay',
      text: 'foo'
    });
    expect(htmlAsset.extension, 'to equal', '.yay');
    expect(htmlAsset.fileName, 'to match', /\d+\.yay$/);
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
  });

  it('should handle an Html asset with no url but a fileName of "thething.yay"', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      fileName: 'thething.yay',
      text: 'foo'
    });
    expect(htmlAsset.extension, 'to equal', '.yay');
    expect(htmlAsset.fileName, 'to equal', 'thething.yay');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', 'thething.blerg');
  });

  it('should handle an Html asset with no url but an extension of ""', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      extension: '',
      text: 'foo'
    });
    expect(htmlAsset.extension, 'to equal', '');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to match', /^\d+\.blerg$/);
  });

  it('should handle an Html asset with no url but a fileName of ""', function() {
    const htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      fileName: '',
      text: 'foo'
    });
    expect(htmlAsset.extension, 'to equal', '');
    expect(htmlAsset.fileName, 'to equal', '');
    htmlAsset.extension = '.blerg';
    expect(htmlAsset.extension, 'to equal', '.blerg');
    expect(htmlAsset.fileName, 'to equal', '.blerg');
  });

  it('should handle an AssetGraph with a loaded asset that has a link to an unloaded asset when the asset is moved', function() {
    const assetGraph = new AssetGraph();

    assetGraph.addAsset({
      type: 'Html',
      url: 'http://example.com/foo.html',
      text:
        '<!DOCTYPE html><html><head></head><body><a href="http://example.com/bar.html">link text</a></body></html>'
    });
    const barHtml = assetGraph.addAsset({
      // Not yet loaded
      type: 'Html',
      url: 'http://example.com/bar.html'
    });
    assetGraph.findRelations({ type: 'HtmlAnchor' })[0].to = barHtml;

    barHtml.url = 'http://example.com/subdir/quux.html';
    expect(
      assetGraph.findRelations({ type: 'HtmlAnchor' })[0].href,
      'to equal',
      'http://example.com/subdir/quux.html'
    );
    expect(
      assetGraph.findAssets({
        type: 'Html',
        path: '/subdir/',
        fileName: 'quux.html'
      })[0].isLoaded,
      'to be false'
    );
    assetGraph.findRelations({ type: 'HtmlAnchor' })[0].hrefType = 'relative';
    expect(
      assetGraph.findRelations({ type: 'HtmlAnchor' })[0].href,
      'to equal',
      'subdir/quux.html'
    );
    expect(
      assetGraph.findAssets({
        type: 'Html',
        path: '/subdir/',
        fileName: 'quux.html'
      })[0].isLoaded,
      'to be false'
    );
  });

  describe('#clone()', function() {
    it('should throw if supplying incoming relations and the asset is not in a graph', function() {
      const assetGraph = new AssetGraph();
      const asset = assetGraph.addAsset({});

      assetGraph.removeAsset(asset);
      expect(
        () => asset.clone(true),
        'to throw',
        /incomingRelations not supported because asset/
      );
    });

    it('should throw when cloning an asset with invalid incoming relations', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/clone/cssWithInlineImage/'
        )
      });

      await assetGraph.loadAssets('index.css');

      expect(assetGraph, 'to contain assets', 'Css', 1);

      const original = assetGraph.findAssets({ type: 'Css' })[0];

      expect(
        original.clone.bind(original, [{}]),
        'to throw',
        /Incoming relation is not a relation/
      );
    });

    it('should handle a test case with multiple Html assets', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/clone/multipleHtmls/'
        )
      });

      await assetGraph.loadAssets('index.html').populate();

      expect(assetGraph, 'to contain assets', 'Html', 3);
      expect(assetGraph, 'to contain asset', 'Png');
      expect(assetGraph, 'to contain asset', { type: 'Css', isInline: true });

      const indexHtml = assetGraph.findAssets({ type: 'Html' })[0];
      const assetClone = indexHtml.clone();
      assetClone.url = indexHtml.url.replace(/\.html$/, '.clone.html');

      expect(assetGraph, 'to contain asset', { fileName: 'index.clone.html' });
      expect(assetGraph, 'to contain relation', {
        from: { fileName: 'index.clone.html' },
        to: { fileName: 'anotherpage.html' }
      });
      expect(assetGraph, 'to contain relation', {
        from: { fileName: 'index.clone.html' },
        to: { fileName: 'yetanotherpage.html' }
      });
      expect(assetGraph, 'to contain relation', {
        from: { fileName: 'index.clone.html' },
        to: { type: 'Css' }
      });
      expect(assetGraph, 'to contain asset', 'Png');
      expect(
        assetGraph,
        'to contain assets',
        { type: 'Css', isInline: true },
        2
      );

      const original = assetGraph.findAssets({ fileName: 'index.html' })[0];
      const cloned = assetGraph.findAssets({ fileName: 'index.clone.html' })[0];
      expect(original.text, 'to equal', cloned.text);
    });

    it('should handle a test case with a Css asset with an inline image', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/clone/cssWithInlineImage/'
        )
      });

      await assetGraph.loadAssets('index.css').populate();

      expect(assetGraph, 'to contain assets', 2);

      assetGraph.findAssets({ type: 'Css' })[0].clone();

      expect(assetGraph, 'to contain assets', 'Css', 2);

      expect(assetGraph, 'to contain assets', 'Png', 2);
      assetGraph.findAssets({ type: 'Css' }).forEach(function(cssAsset) {
        expect(assetGraph, 'to contain relation', {
          from: cssAsset,
          to: { isInline: true, isImage: true }
        });
      });
    });
  });

  it('should handle a test case with Html assets with meta tags specifying iso-8859-1', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Asset/encoding/'
      )
    });

    await assetGraph
      .loadAssets('iso-8859-1.html', 'iso-8859-1-simple-meta.html')
      .populate();

    assetGraph.findAssets().forEach(function(asset) {
      expect(asset.text, 'to contain', 'æøåÆØÅ');
    });

    expect(
      assetGraph.findAssets()[0].parseTree.body.firstChild.nodeValue,
      'to begin with',
      'æøåÆØÅ'
    );
    expect(
      assetGraph.findAssets()[0].rawSrc.toString('binary'),
      'to contain',
      '\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5'
    );
  });

  it('should handle a Css asset with @charset declaration of iso-8859-1', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Asset/encoding/'
      )
    });

    await assetGraph.loadAssets('iso-8859-1.css').populate();

    expect(assetGraph.findAssets()[0].text, 'to contain', 'æøå');
    expect(
      assetGraph.findAssets({})[0].parseTree.nodes[3].nodes,
      'to satisfy',
      { 0: { prop: 'foo', value: 'æøå' } }
    );
  });

  describe('#inline()', function() {
    it('should handle a test case with an Html asset that has an external Css asset in a conditional comment', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/inline/'
        )
      });

      await assetGraph.loadAssets('index.html').populate();

      expect(assetGraph, 'to contain assets', 4);
      expect(assetGraph, 'to contain assets', 'Html', 2);
      expect(assetGraph, 'to contain asset', 'Css');
      expect(assetGraph, 'to contain asset', 'Png');

      assetGraph.findRelations({ type: 'HtmlStyle' })[0].inline();

      expect(assetGraph, 'to contain asset', { type: 'Css', isInline: true });
      expect(
        assetGraph.findRelations({ type: 'CssImage' })[0].href,
        'to equal',
        'some/directory/foo.png'
      );

      const text = assetGraph.findAssets({ type: 'Html' })[0].text;
      const matches = text.match(/url\((.*?foo\.png)\)/g);
      expect(matches, 'to be an array');
      expect(matches[1], 'to equal', 'url(some/directory/foo.png)');
      expect(matches, 'to have length', 2);
    });
  });

  describe('#incomingRelations', function() {
    it('should throw when trying to determine incoming relations from an asset that is not in a graph', function() {
      const assetGraph = new AssetGraph();
      const asset = assetGraph.addAsset({});
      assetGraph.removeAsset(asset);
      expect(function() {
        return asset.incomingRelations;
      }, 'to throw');
    });
  });

  describe('#populate()', function() {
    it('should throw when trying to populate an asset that is not in a graph', function() {
      const assetGraph = new AssetGraph();
      const asset = assetGraph.addAsset({});

      assetGraph.removeAsset(asset);

      expect(() => asset.populate(), 'to throw');
    });

    it('should attach a fragment link in an inline asset correctly', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/selfAnchorInInlineSvg/'
        )
      });

      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain relation', {
        type: 'SvgUse',
        from: { type: 'Svg' },
        to: { type: 'Svg' }
      });
    });
  });

  describe('#replaceWith()', function() {
    describe('when passed an asset config object', function() {
      it('should update the incoming relations of the existing asset', async function() {
        const htmlAsset = new AssetGraph().addAsset({
          type: 'Html',
          url: 'https://www.example.com/',
          text: `
            <!DOCTYPE html>
            <html>
                <head></head>
                <body>
                    <script src="foo.js"></script>
                </body>
            </html>
          `
        });

        httpception({
          request: 'GET https://www.example.com/foo.js',
          response: {
            headers: {
              'Content-Type': 'application/javascript'
            },
            body: 'alert("foo");'
          }
        });

        const javaScriptAsset = htmlAsset.outgoingRelations[0].to;

        await javaScriptAsset.load();

        const replacementJavaScript = javaScriptAsset.replaceWith({
          type: 'JavaScript',
          text: 'alert("bar");'
        });

        expect(replacementJavaScript, 'to satisfy', {
          type: 'JavaScript',
          url: 'https://www.example.com/foo.js',
          text: 'alert("bar");',
          incomingRelations: [{ from: { url: 'https://www.example.com/' } }]
        });
      });

      describe('when the new asset does not have a url', function() {
        it('should take over the url of the old asset', async function() {
          const htmlAsset = new AssetGraph().addAsset({
            type: 'Html',
            url: 'https://www.example.com/somewhere/deep/index.html',
            text: '<!DOCTYPE html><html></html>'
          });

          const replacementJavaScript = htmlAsset.replaceWith({
            type: 'Html',
            text: `
              <!DOCTYPE html>
              <html>
              </html>
            `
          });

          expect(
            replacementJavaScript.url,
            'to equal',
            'https://www.example.com/somewhere/deep/index.html'
          );
        });
      });

      describe('when the new asset has a url', function() {
        it('should preserve the new url', async function() {
          const htmlAsset = new AssetGraph().addAsset({
            type: 'Html',
            url: 'https://www.example.com/somewhere/deep/index.html',
            text: '<!DOCTYPE html><html></html>'
          });

          const replacementJavaScript = htmlAsset.replaceWith({
            type: 'Html',
            url: 'https://www.example.com/somewhere/else.html',
            text: `
              <!DOCTYPE html>
              <html>
              </html>
            `
          });

          expect(
            replacementJavaScript.url,
            'to equal',
            'https://www.example.com/somewhere/else.html'
          );
        });
      });

      it('should interpret the urls in the replacement asset as relative to the old assets url', async function() {
        const htmlAsset = new AssetGraph().addAsset({
          type: 'Html',
          url: 'https://www.example.com/somewhere/deep/index.html',
          text: '<!DOCTYPE html><html></html>'
        });

        const replacementJavaScript = htmlAsset.replaceWith({
          type: 'Html',
          text: `
            <!DOCTYPE html>
            <html>
              <script src="foo.js"></script>
            </html>
          `
        });

        expect(
          replacementJavaScript.outgoingRelations[0].to.url,
          'to equal',
          'https://www.example.com/somewhere/deep/foo.js'
        );
      });
    });

    describe('when passed an existing asset', function() {
      it('should update the incoming relations', async function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://www.example.com/',
          text: `
              <!DOCTYPE html>
              <html>
                  <head></head>
                  <body>
                      <a href="hey.html">Look here</a>
                  </body>
              </html>
          `
        });

        const replacementHtmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://www.example.com/somewhere/else/page.html',
          text:
            '<!DOCTYPE html><html><head></head><body><a href="look/here.html">indeed</a></body></html>'
        });

        htmlAsset.replaceWith(replacementHtmlAsset);

        expect(replacementHtmlAsset, 'to satisfy', {
          type: 'Html',
          url: 'https://www.example.com/',
          text:
            '<!DOCTYPE html><html><head></head><body><a href="somewhere/else/look/here.html">indeed</a></body></html>'
        });
      });
    });
  });

  describe('#outgoingRelations', function() {
    it('should handle a combo test case', function() {
      const assetGraph = new AssetGraph({ root: 'http://example.com/' });

      const fooHtml = assetGraph.addAsset({
        type: 'Html',
        url: 'http://example.com/foo.html',
        text:
          '<!DOCTYPE html>\n' +
          '<html><head><style type="text/css">body{background-image: url(foo.png)}</style></head>' +
          '<body><a href="quux.html">Link text</a></body></html>'
      });

      expect(fooHtml.outgoingRelations, 'to have length', 2);
      expect(fooHtml.outgoingRelations[0].type, 'to equal', 'HtmlStyle');
      expect(fooHtml.outgoingRelations[1].type, 'to equal', 'HtmlAnchor');

      expect(fooHtml.outgoingRelations[0].to.isAsset, 'to equal', true);
      expect(fooHtml.outgoingRelations[0].to.type, 'to equal', 'Css');

      expect(
        fooHtml.outgoingRelations[0].to.outgoingRelations,
        'to have length',
        1
      );
      expect(
        fooHtml.outgoingRelations[0].to.outgoingRelations[0].type,
        'to equal',
        'CssImage'
      );
      expect(
        fooHtml.outgoingRelations[0].to.outgoingRelations[0].to.isResolved,
        'to be true'
      );

      expect(fooHtml.outgoingRelations[1].to.isResolved, 'to be true');

      assetGraph.addAsset({
        type: 'Html',
        url: 'http://example.com/quux.html',
        text:
          '<!DOCTYPE html>\n<html><head><title>Boring document</title></head></html>'
      });
      assetGraph.addAsset({
        type: 'Html',
        url: 'http://example.com/baz.html',
        text:
          '<!DOCTYPE html>\n<html><head><title>Another boring document</title></head></html>'
      });

      expect(assetGraph, 'to contain relation', {
        type: 'HtmlAnchor',
        to: assetGraph.findAssets({ fileName: 'quux.html' })[0]
      });

      expect(assetGraph, 'to contain relation', 'HtmlStyle');

      expect(assetGraph, 'to contain relation', 'HtmlAnchor');

      fooHtml.text =
        '<!DOCTYPE html>\n<html><head></head><body><a href="baz.html">Another link text</a></body></html>';

      expect(assetGraph, 'to contain relation', {
        type: 'HtmlAnchor',
        to: {
          $in: assetGraph.findAssets({ type: 'Html', fileName: 'baz.html' })
        }
      });

      fooHtml.addRelation(
        {
          type: 'HtmlAnchor',
          to: assetGraph.findAssets({ fileName: 'quux.html' })[0]
        },
        'after',
        assetGraph.findRelations({ type: 'HtmlAnchor', from: fooHtml })[0]
      );

      expect(fooHtml.text, 'to match', /baz\.html/);
      expect(fooHtml.text, 'to match', /quux\.html/);
      assetGraph.removeAsset(fooHtml);

      expect(fooHtml.outgoingRelations, 'to have length', 2);
      expect(fooHtml.outgoingRelations[0].type, 'to equal', 'HtmlAnchor');
      expect(
        fooHtml.outgoingRelations[0].to.url,
        'to equal',
        'http://example.com/baz.html'
      );
      expect(fooHtml.outgoingRelations[1].type, 'to equal', 'HtmlAnchor');
      expect(
        fooHtml.outgoingRelations[1].to.url,
        'to equal',
        'http://example.com/quux.html'
      );

      expect(assetGraph, 'to contain no relations', 'HtmlAnchor');

      assetGraph.addAsset(fooHtml);

      expect(assetGraph, 'to contain relations', 'HtmlAnchor', 2);

      let clone = fooHtml.clone();
      clone.url = 'http://example.com/fooclone1.html';

      expect(clone, 'not to be undefined');
      let outgoingRelations = assetGraph.findRelations({ from: clone });
      expect(outgoingRelations, 'to have length', 2);
      expect(
        outgoingRelations[0].to.url,
        'to equal',
        'http://example.com/baz.html'
      );
      expect(
        outgoingRelations[1].to.url,
        'to equal',
        'http://example.com/quux.html'
      );

      fooHtml.url = 'http://example.com/another/place/foo.html';
      clone = fooHtml.clone();
      clone.url = 'http://example.com/another/place/fooclone2.html';

      expect(clone, 'not to be undefined');
      outgoingRelations = assetGraph.findRelations({ from: clone });
      expect(outgoingRelations, 'to have length', 2);
      expect(
        outgoingRelations[0].to.url,
        'to equal',
        'http://example.com/baz.html'
      );
      expect(
        outgoingRelations[1].to.url,
        'to equal',
        'http://example.com/quux.html'
      );
    });

    it('should be populated immediately after updating an existing asset with more info', function() {
      const assetGraph = new AssetGraph();

      const firstAsset = assetGraph.addAsset({
        url: 'https://example.com/styles.css'
      });

      const secondAsset = assetGraph.addAsset({
        url: 'https://example.com/styles.css',
        type: 'Css',
        text: 'body { background: #ff69b4 url("../images/logo1.svg"); }'
      });
      expect(firstAsset, 'to be', secondAsset);

      expect(firstAsset.outgoingRelations, 'to have length', 1);
    });
  });

  describe('#rawSrc', function() {
    it('should throw when getting a non-existing rawSrc', function() {
      expect(
        () => new AssetGraph().addAsset({ type: 'Asset' }).rawSrc,
        'to throw'
      );
    });

    it('should throw when getting a non-existing rawSrc from an asset in a graph', function() {
      const assetGraph = new AssetGraph();
      const asset = new AssetGraph().addAsset({});

      assetGraph.addAsset(asset);

      expect(() => asset.rawSrc, 'to throw', /Asset isn't loaded/);
    });

    it('should set the rawSrc of an asset correctly', function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/rawSrc/'
        )
      });
      const original = assetGraph.addAsset({
        rawSrc: new Buffer('original', 'utf8')
      });
      const clone = assetGraph.addAsset({
        rawSrc: new Buffer('clone', 'utf8')
      });

      const unloadSpy = sinon.spy(clone, 'unload');
      const markDirtySpy = sinon.spy(clone, 'markDirty');
      const populateSpy = sinon.spy(clone, 'populate');

      clone.rawSrc = original.rawSrc;

      expect(unloadSpy, 'was called once');
      expect(markDirtySpy, 'was called once');
      expect(populateSpy, 'was called once');
      expect(clone.rawSrc.toString(), 'to be', original.rawSrc.toString());
    });

    it('should handle a test case with the same Png image loaded from disc and http', async function() {
      httpception({
        request: 'GET http://gofish.dk/purplealpha24bit.png',
        response: {
          statusCode: 200,
          headers: {
            'Content-Length': 8285,
            'Content-Type': 'image/png'
          },
          body: fs.readFileSync(
            pathModule.resolve(
              __dirname,
              '../../testdata/assets/Asset/rawSrc/purplealpha24bit.png'
            )
          )
        }
      });

      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/rawSrc/'
        )
      });
      await assetGraph.loadAssets(
        'purplealpha24bit.png',
        'http://gofish.dk/purplealpha24bit.png'
      );

      expect(
        assetGraph,
        'to contain assets',
        { type: 'Png', isLoaded: true },
        2
      );
      const pngAssets = assetGraph.findAssets({ type: 'Png' });
      expect(pngAssets[0].rawSrc, 'to have length', 8285);
      expect(pngAssets[0].rawSrc, 'to equal', pngAssets[1].rawSrc);
    });
  });

  describe('#url', function() {
    describe('when an existing asset occupies the same url', function() {
      it('should move the other asset out of the way by appending a unique suffix to the base name', function() {
        const assetGraph = new AssetGraph();
        const fooTxt = assetGraph.addAsset({
          type: 'Text',
          url: 'https://example.com/foo.txt'
        });
        const barTxt = assetGraph.addAsset({
          type: 'Text',
          url: 'https://example.com/bar.txt'
        });
        barTxt.url = 'https://example.com/foo.txt';
        expect(fooTxt.url, 'to equal', 'https://example.com/foo-1.txt');
      });
    });

    it('should handle a test case with 3 assets', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/setAssetUrl/simple/'
        )
      });

      await assetGraph.loadAssets('index.html').populate();

      expect(assetGraph, 'to contain assets', 3);
      expect(assetGraph, 'to contain assets', 'Html', 2);
      expect(assetGraph, 'to contain asset', 'Png');

      const initialHtml = assetGraph.findAssets({ type: 'Html' })[0];
      initialHtml.url = urlTools.resolveUrl(
        assetGraph.root,
        'bogus/index.html'
      );

      let relativeUrl = assetGraph
        .findRelations({ type: 'HtmlAnchor' })[0]
        .node.getAttribute('href');
      expect(relativeUrl, 'to equal', '../otherpage.html');

      const otherHtml = assetGraph.findAssets({ type: 'Html' })[1];
      otherHtml.url = urlTools.resolveUrl(
        assetGraph.root,
        'fluff/otherpage.html'
      );

      relativeUrl = assetGraph
        .findRelations({ type: 'HtmlAnchor' })[0]
        .node.getAttribute('href');
      expect(relativeUrl, 'to equal', '../fluff/otherpage.html');

      relativeUrl = assetGraph
        .findRelations({ type: 'HtmlImage' })[0]
        .node.getAttribute('src');
      expect(relativeUrl, 'to equal', '../foo.png');
    });

    it('should handle a test case with an Html asset that has multiple levels of inline assets', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Asset/setAssetUrl/multipleLevelsOfInline/'
        )
      });

      await assetGraph.loadAssets('index.html').populate();

      expect(assetGraph, 'to contain asset', 'Css');
      expect(assetGraph, 'to contain asset', { type: 'Html', isInline: true });
      expect(assetGraph, 'to contain asset', { type: 'Html', isInline: false });

      await assetGraph.moveAssets({ type: 'Html', isInline: false }, function(
        asset,
        assetGraph
      ) {
        return urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
      });

      expect(
        assetGraph.findRelations({ type: 'CssImage' })[0].propertyNode.value,
        'to equal',
        'url(../foo.png)'
      );
    });

    it('should handle a test case with a single Html file', async function() {
      const assetGraph = new AssetGraph({ root: 'file:///foo/bar/quux' });

      await assetGraph.loadAssets(
        new AssetGraph().addAsset({
          type: 'Html',
          url: 'file:///foo/bar/quux/baz/index.html',
          text: '<!DOCTYPE html><html></html>'
        })
      );

      assetGraph.findAssets()[0].url = 'otherdir/index.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'file:///foo/bar/quux/baz/otherdir/index.html'
      );

      assetGraph.findAssets()[0].url = '/hey/index.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'file:///foo/bar/quux/hey/index.html'
      );

      assetGraph.findAssets()[0].url = '//hey.com/there/index.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'http://hey.com/there/index.html'
      );

      assetGraph.findAssets()[0].url = 'you/go/index.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'http://hey.com/there/you/go/index.html'
      );

      assetGraph.findAssets()[0].url = '/and/then/here.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'http://hey.com/and/then/here.html'
      );

      assetGraph.findAssets()[0].url = '//example.com/then/here.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'http://example.com/then/here.html'
      );

      assetGraph.findAssets()[0].url = 'https://example2.com/then/here.html';
      assetGraph.findAssets()[0].url = '//example.com/then/here.html';
      expect(
        assetGraph.findAssets()[0].url,
        'to equal',
        'https://example.com/then/here.html'
      );
    });

    it('should throw when trying to set an url on a non-externalizable asset', function() {
      const asset = new AssetGraph().addAsset({});
      asset.isExternalizable = false;

      expect(() => (asset.url = 'foo'), 'to throw');
    });

    it('should remove the incomingInlineRelation property when un-inlining', function() {
      const asset = new AssetGraph().addAsset({
        type: 'Html',
        text: '<!DOCTYPE html><html><head><style>/*foo*/</style></head></html>'
      });
      const htmlStyle = asset.outgoingRelations[0];
      expect(htmlStyle.to.incomingInlineRelation, 'to be', htmlStyle);
      htmlStyle.to.url = 'http://example.com/styles.css';
      expect(htmlStyle.to.incomingInlineRelation, 'to be undefined');
    });
  });

  it('should handle an inline asset with an empty url (should resolve to the url of the containing asset)', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/quux' });
    await assetGraph.loadAssets({
      type: 'Html',
      url: 'file:///foo/bar/quux/baz/index.html',
      text:
        '<!DOCTYPE html><html><head><script>const foo = "".toString("url")</script></head><body></body></html>'
    });

    expect(assetGraph, 'to contain relation', {
      from: { url: 'file:///foo/bar/quux/baz/index.html' },
      to: { type: 'JavaScript', isInline: true }
    });
    expect(assetGraph, 'to contain relation', {
      from: { type: 'JavaScript' },
      to: { url: 'file:///foo/bar/quux/baz/index.html' }
    });
  });

  describe('#extension', function() {
    it('should be appended when no etension exists', function() {
      const asset = new AssetGraph().addAsset({
        fileName: 'foo'
      });

      asset.extension = '.bar';

      expect(asset.extension, 'to be', '.bar');
      expect(asset.fileName, 'to be', 'foo.bar');
    });

    it('should be replaced it if exists', function() {
      const asset = new AssetGraph().addAsset({
        fileName: 'foo.bar'
      });

      asset.extension = '.baz';

      expect(asset.extension, 'to be', '.baz');
      expect(asset.fileName, 'to be', 'foo.baz');
    });
  });

  describe('#urlOrDescription', function() {
    it('should return the url if the url is not a file-url', function() {
      const url = 'https://twitter.com/';
      const asset = new AssetGraph().addAsset({
        url
      });

      expect(asset.urlOrDescription, 'to be', url);
    });

    it('should make a file-url under process.cwd() relative to process.cwd()', function() {
      const asset = new AssetGraph().addAsset({
        url: 'file://' + process.cwd() + '/foo/bar.baz'
      });

      expect(asset.urlOrDescription, 'to be', 'foo/bar.baz');
    });

    describe('on Windows', function() {
      const originalPlatform = process.platform;
      beforeEach(function() {
        Object.defineProperty(process, 'platform', { value: 'win32' });
      });
      afterEach(function() {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });

      it('should not break when the root of the AssetGraph instance is a windows-style file: url', async function() {
        const assetGraph = new AssetGraph({
          root:
            'file:///C%3A/projects/assetgraph/testdata/addAsset/relativeUrl/'
        });

        assetGraph.addAsset('foo.png');
        expect(
          assetGraph.findAssets()[0].url,
          'to equal',
          'file:///C%3A/projects/assetgraph/testdata/addAsset/relativeUrl/foo.png'
        );
        expect(
          assetGraph.findAssets()[0].urlOrDescription,
          'to equal',
          'C:/projects/assetgraph/testdata/addAsset/relativeUrl/foo.png'
        );
      });
    });
  });

  it('should consider a fragment part of the relation href, not the asset url', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Asset/fragment/'
      )
    });

    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain assets', 2);
    expect(assetGraph, 'to contain asset', { fileName: 'otherpage.html' });
    expect(assetGraph, 'to contain relation', {
      href: 'otherpage.html#fragment1'
    });
    expect(assetGraph, 'to contain relation', {
      href: 'otherpage.html#fragment2'
    });

    expect(assetGraph, 'to contain relation', { href: '#selffragment' });

    assetGraph.findAssets({ fileName: 'otherpage.html' })[0].url =
      'http://example.com/';

    expect(assetGraph, 'to contain relation', {
      href: 'http://example.com/#fragment1'
    });
    expect(assetGraph, 'to contain relation', {
      href: 'http://example.com/#fragment2'
    });

    assetGraph.findAssets({ fileName: 'index.html' })[0].url =
      'http://example.com/yaddayadda.html';
    expect(assetGraph, 'to contain relation', { href: '#selffragment' });
  });

  describe('#unload', function() {
    it('should clear inline assets from the graph', async function() {
      const assetGraph = new AssetGraph();

      await assetGraph
        .loadAssets({
          url: 'file://' + process.cwd() + '/foo/bar.html',
          text:
            '<!DOCTYPE html>\n' +
            '<html>\n' +
            '<head>\n' +
            '<style>\n' +
            'body {\n' +
            '    background-image: url(data:image/svg+xml;base64,' +
            new Buffer(
              '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<svg>\n' +
                '<rect x="200" y="100" width="600" height="300" style="color: maroon"/>\n' +
                '<rect x="200" y="100" width="600" height="300" style="color: maroon"/>\n' +
                '</svg>'
            ).toString('base64') +
            ');\n' +
            '}\n' +
            '</style>\n' +
            '</head>\n' +
            '</html>'
        })
        .populate();

      expect(assetGraph, 'to contain assets', 5);
      assetGraph.findAssets({ type: 'Html' })[0].unload();
      expect(assetGraph.findAssets({ type: 'Html' })[0], 'to satisfy', {
        isPopulated: expect.it('to be falsy')
      });
      expect(assetGraph, 'to contain assets', 1);
    });

    it('should work in the presence of self-referencing inline assets', async function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        url: 'https://example.com/',
        type: 'Html',
        text: `
          <!DOCTYPE html>
          <html>
          <head></head>
          <body>
            <svg><use href="#foo" xlink:href="#foo"></use></svg>
          </body>
          </html>
        `
      });
      htmlAsset.unload();
    });
  });

  describe('text setter', function() {
    it('should clear inline assets when the text of an asset is overridden', async function() {
      const assetGraph = new AssetGraph();

      await assetGraph
        .loadAssets({
          url: 'file://' + process.cwd() + '/foo/bar.html',
          text:
            '<!DOCTYPE html>\n' +
            '<html>\n' +
            '<head>\n' +
            '<style>\n' +
            'body {\n' +
            '    background-image: url(data:image/svg+xml;base64,' +
            new Buffer(
              '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<svg>\n' +
                '<rect x="200" y="100" width="600" height="300" style="color: maroon"/>\n' +
                '<rect x="200" y="100" width="600" height="300" style="color: maroon"/>\n' +
                '</svg>'
            ).toString('base64') +
            ');\n' +
            '}\n' +
            '</style>\n' +
            '</head>\n' +
            '</html>'
        })
        .populate();

      expect(assetGraph, 'to contain assets', 5);
      assetGraph.findAssets({ type: 'Svg' })[0].text =
        '<?xml version="1.0" encoding="UTF-8"?>\n<svg></svg>';
      expect(assetGraph, 'to contain assets', 3);
    });
  });

  describe('#baseName', function() {
    describe('when invoked as a getter', function() {
      it('should retrieve the base name from the url', function() {
        expect(
          new AssetGraph().addAsset({
            url: 'https://example.com/foobar.html'
          }).baseName,
          'to equal',
          'foobar'
        );
      });

      it('should return undefined when there is no file name', function() {
        expect(
          new AssetGraph().addAsset({
            url: 'https://example.com/'
          }).baseName,
          'to be undefined'
        );
      });
    });

    describe('when invoked as a setter', function() {
      it('should update the base name of the url', function() {
        const asset = new AssetGraph().addAsset({
          url: 'https://example.com/foobar.html'
        });

        asset.baseName = 'yadda';

        expect(asset.url, 'to equal', 'https://example.com/yadda.html');
      });

      it('should preserve the extension', function() {
        const asset = new AssetGraph().addAsset({
          url: 'https://example.com/foobar.html'
        });

        asset.extension = '.foo';
        asset.baseName = 'yadda';

        expect(asset.url, 'to equal', 'https://example.com/yadda.foo');
      });

      it('should return undefined when there is no file name', function() {
        expect(
          new AssetGraph().addAsset({
            url: 'https://example.com/'
          }).baseName,
          'to be undefined'
        );
      });
    });
  });

  describe('#dataUrl getter', function() {
    it('should not percent-encode the comma character', function() {
      expect(
        new AssetGraph().addAsset({
          type: 'Text',
          text: 'foo,bar quux,baz'
        }).dataUrl,
        'to equal',
        'data:text/plain,foo,bar%20quux,baz'
      );
    });
  });

  it('should allow specifying outgoingRelations when instantiating', function() {
    const assetGraph = new AssetGraph();
    const page1 = assetGraph.addAsset({
      url: 'http://example.com/page1.html',
      type: 'Html',
      text: `
                <!DOCTYPE html>
                <html>
                <head>
                    <link rel="stylesheet" href="a.css">
                    <link rel="stylesheet" href="b.css">
                </head>
                </html>`
    });

    const parseTree = page1.parseTree;
    const outgoingRelations = page1.outgoingRelations;

    const page2 = assetGraph.addAsset({
      type: 'Html',
      parseTree,
      outgoingRelations
    });

    expect(page2.outgoingRelations, 'to satisfy', [
      { from: page2 },
      { from: page2 }
    ]);
  });

  it('should allow specifying incomingRelations when instantiating', function() {
    const assetGraph = new AssetGraph();
    const page1 = assetGraph.addAsset({
      url: 'https://example.com/page1.html',
      type: 'Html',
      text: `
                <!DOCTYPE html>
                <html>
                <head>
                    <a href="a.html"></a>
                    <iframe src="b.html"></iframe>
                </head>
                </html>`
    });

    const parseTree = page1.parseTree;
    const incomingRelations = page1.outgoingRelations;

    const page2 = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/somewhere/page2.html',
      parseTree,
      incomingRelations
    });

    expect(page1.outgoingRelations, 'to satisfy', [
      { to: page2 },
      { to: page2 }
    ]);

    expect(page1.text, 'to contain', '<a href="somewhere/page2.html">').and(
      'to contain',
      '<iframe src="somewhere/page2.html">'
    );
  });

  describe('#_isCompatibleWith', function() {
    it('should consider Css compatible with Asset', function() {
      expect(
        new AssetGraph()
          .addAsset({ type: 'Css', text: '' })
          ._isCompatibleWith(undefined),
        'to be true'
      );
    });

    it('should consider Atom compatible with Xml', function() {
      expect(
        new AssetGraph()
          .addAsset({
            type: 'Atom',
            text: '<?xml version="1.0" encoding="utf-8"?>'
          })
          ._isCompatibleWith('Xml'),
        'to be true'
      );
    });

    it('should consider Xml compatible with Atom', function() {
      expect(
        new AssetGraph()
          .addAsset({
            type: 'Xml',
            text: '<?xml version="1.0" encoding="utf-8"?>'
          })
          ._isCompatibleWith('Atom'),
        'to be true'
      );
    });

    it('should consider Css incompatible with JavaScript', function() {
      expect(
        new AssetGraph()
          .addAsset({ type: 'Css', text: '' })
          ._isCompatibleWith('JavaScript'),
        'to be false'
      );
    });
  });

  describe('#type', function() {
    describe('when the asset is not loaded', function() {
      it('should use the Content-Type if available', function() {
        expect(
          new AssetGraph().addAsset({
            url: 'https://example.com/',
            contentType: 'text/css'
          }).type,
          'to equal',
          'Css'
        );
      });

      it('should guess based on the file extension when no other info exists', function() {
        expect(
          new AssetGraph().addAsset({ url: 'https://example.com/foo.css' })
            .type,
          'to equal',
          'Css'
        );
      });

      describe('when an incoming relation is available', function() {
        it('should guess based on the targetType of the incoming relation', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            text: '<link rel="stylesheet" href="https://example.com/">'
          });
          expect(htmlAsset.outgoingRelations[0].to.type, 'to equal', 'Css');
        });

        it('should guess the abstract Image type when the incoming relation could point at any Image', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            text: '<img src="https://example.com/">'
          });
          expect(htmlAsset.outgoingRelations[0].to.type, 'to equal', 'Image');
        });

        it('should guess a more specific type when a sensible file extension is available', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            text: '<img src="https://example.com/foo.png">'
          });
          expect(htmlAsset.outgoingRelations[0].to.type, 'to equal', 'Png');
        });
      });

      it('should return Asset if there is no usable file extension', function() {
        expect(
          new AssetGraph().addAsset({ url: 'https://example.com/' }).type,
          'to be undefined'
        );
      });
    });
  });

  describe('#query', function() {
    describe('invoked as a getter', function() {
      it('should produce an object representing the query string', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar&baz=quux'
        });
        expect(htmlAsset.query, 'to satisfy', {
          foo: 'bar',
          baz: 'quux'
        });
      });

      it('should produce a fresh object after the url property has been updated', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar&baz=quux'
        });
        const query = htmlAsset.query;
        htmlAsset.url = 'https://example.com/?hey=there';
        expect(htmlAsset.query, 'not to be', query).and('to satisfy', {
          hey: 'there'
        });
      });

      it('should return undefined for an inline asset', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<style>body { color: maroon; }</style>'
        });
        expect(htmlAsset.outgoingRelations[0].to.query, 'to be undefined');
      });

      it('should turn into undefined after an asset is inlined', function() {
        const assetGraph = new AssetGraph();
        const cssAsset = assetGraph.addAsset({
          type: 'Css',
          url: 'https://example.com/styles.css',
          text: 'body { color: maroon; }'
        });
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<link rel="stylesheet" href="styles.css">'
        });
        htmlAsset.outgoingRelations[0].inline();
        expect(cssAsset.query, 'to be undefined');
      });

      it('should support the in operator', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar'
        });
        expect('foo' in htmlAsset.query, 'to be true');
      });

      describe('when mutating the returned object', function() {
        it('should mutate an existing url parameter if mutated', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: 'https://example.com/?foo=bar&baz=quux'
          });
          htmlAsset.query.foo = 'yeah';
          expect(
            htmlAsset.url,
            'to equal',
            'https://example.com/?foo=yeah&baz=quux'
          );
        });

        it('should introduce a query string if there is not one already', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: 'https://example.com/'
          });
          htmlAsset.query.foo = 'yeah';
          expect(htmlAsset.url, 'to equal', 'https://example.com/?foo=yeah');
        });

        it('should support passing a parameter value as a number', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: 'https://example.com/'
          });
          htmlAsset.query.foo = 123;
          expect(htmlAsset.url, 'to equal', 'https://example.com/?foo=123');
        });

        it('should remove a parameter from the query string via delete', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: 'https://example.com/?foo=bar&baz=quux'
          });
          delete htmlAsset.query.baz;
          expect(htmlAsset.url, 'to equal', 'https://example.com/?foo=bar');
        });

        describe('when deleting the last parameter', function() {
          it('should remove the query string from the url', function() {
            const assetGraph = new AssetGraph();
            const htmlAsset = assetGraph.addAsset({
              type: 'Html',
              url: 'https://example.com/?foo=bar'
            });
            delete htmlAsset.query.foo;
            expect(htmlAsset.url, 'to equal', 'https://example.com/');
          });

          it('should preserve the fragment identifier of incoming relations', function() {
            const assetGraph = new AssetGraph();
            const cssAsset = assetGraph.addAsset({
              type: 'Css',
              url: 'https://example.com/styles.css?foo=bar',
              text: 'body { color: maroon; }'
            });
            const htmlAsset = assetGraph.addAsset({
              type: 'Html',
              url: 'https://example.com/',
              text: '<link rel="stylesheet" href="styles.css?foo=bar#hey">'
            });
            delete cssAsset.query.foo;
            expect(
              htmlAsset.outgoingRelations[0].href,
              'to equal',
              'styles.css#hey'
            );
          });
        });
      });
    });

    describe('invoked as a setter', function() {
      it('store the query string in _query', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com:123/hey/there?foo',
          text: '<style>body { color: maroon; }</style>'
        });

        htmlAsset.outgoingRelations[0].to.query = { foo: 123 };
        expect(htmlAsset.outgoingRelations[0].to._query, 'to equal', 'foo=123');
      });

      it('should replace the existing query string based on an object', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar'
        });
        htmlAsset.query = { baz: 'quux' };
        expect(htmlAsset.url, 'to equal', 'https://example.com/?baz=quux');
      });

      it('should replace the existing query string based on an string', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar'
        });
        htmlAsset.query = 'baz=quux';
        expect(htmlAsset.url, 'to equal', 'https://example.com/?baz=quux');
      });

      it('should replace the existing query string based on an string with a leading question mark', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar'
        });
        htmlAsset.query = '?baz=quux';
        expect(htmlAsset.url, 'to equal', 'https://example.com/?baz=quux');
      });

      it('should install a vivified query object', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/?foo=bar'
        });
        htmlAsset.query = { baz: 'hey' };
        htmlAsset.query.quux = 'abc';
        expect(
          htmlAsset.url,
          'to equal',
          'https://example.com/?baz=hey&quux=abc'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            query: {
              foobar: 123
            }
          });
          expect(asset.url, 'to equal', 'https://foo.com/bar.js?foobar=123');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            query: {
              foobar: 123
            }
          });
          expect(
            asset.url,
            'to equal',
            `https://example.com/${asset.id}.js?foobar=123`
          );
        });
      });
    });
  });

  describe('#username', function() {
    describe('invoked as a getter', function() {
      it('should return the username of an http url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foo:bar@example.com/'
        });
        expect(htmlAsset.username, 'to equal', 'foo');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the asset is inline', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].to.username = 'foo'),
          'to throw',
          'Cannot update the username of an inline asset'
        );
      });

      it('should introduce an username/auth part to a url that does not already have one', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com:123/hey/there?foo'
        });

        htmlAsset.username = 'foo';
        expect(
          htmlAsset.url,
          'to equal',
          'https://foo@foobar.com:123/hey/there?foo'
        );
      });

      it('should replace an existing username in the url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://baz:quux@foobar.com:123/hey/there?foo'
        });

        htmlAsset.username = 'foo';
        expect(
          htmlAsset.url,
          'to equal',
          'https://foo:quux@foobar.com:123/hey/there?foo'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            username: 'baz'
          });
          expect(asset.url, 'to equal', 'https://baz@foo.com/bar.js');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            username: 'baz'
          });
          expect(
            asset.url,
            'to equal',
            `https://baz@example.com/${asset.id}.js`
          );
        });
      });
    });
  });

  describe('#password', function() {
    describe('invoked as a getter', function() {
      it('should return the password of an http url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foo:bar@example.com/'
        });
        expect(htmlAsset.password, 'to equal', 'bar');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the asset is inline', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].to.password = 'foo'),
          'to throw',
          'Cannot update the password of an inline asset'
        );
      });

      it('should introduce an password/auth part to a url that does not already have one', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com:123/hey/there?foo'
        });

        htmlAsset.password = 'foo';
        expect(
          htmlAsset.url,
          'to equal',
          'https://:foo@foobar.com:123/hey/there?foo'
        );
      });

      it('should replace an existing password in the url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://baz:quux@foobar.com:123/hey/there?foo'
        });

        htmlAsset.password = 'foo';
        expect(
          htmlAsset.url,
          'to equal',
          'https://baz:foo@foobar.com:123/hey/there?foo'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            password: 'baz'
          });
          expect(asset.url, 'to equal', 'https://:baz@foo.com/bar.js');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            password: 'baz'
          });
          expect(
            asset.url,
            'to equal',
            `https://:baz@example.com/${asset.id}.js`
          );
        });
      });
    });
  });

  describe('#hostname', function() {
    describe('invoked as a getter', function() {
      it('should return the hostname of an http url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/'
        });
        expect(htmlAsset.hostname, 'to equal', 'example.com');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the asset is inline', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].to.hostname = 'foo'),
          'to throw',
          'Cannot update the hostname of an inline asset'
        );
      });

      it('should update the hostname of the url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com:123/hey/there?foo'
        });

        htmlAsset.hostname = 'example.com';
        expect(
          htmlAsset.url,
          'to equal',
          'https://example.com:123/hey/there?foo'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            hostname: 'example.com'
          });
          expect(asset.url, 'to equal', 'https://example.com/bar.js');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            hostname: 'example.com'
          });
          expect(asset.url, 'to equal', `https://example.com/${asset.id}.js`);
        });
      });
    });
  });

  describe('#port', function() {
    describe('invoked as a getter', function() {
      it('should return the port of an http url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:1234/'
        });
        expect(htmlAsset.port, 'to equal', 1234);
      });

      it('should return undefined if an http url does not contain an explicit port', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/'
        });
        expect(htmlAsset.port, 'to be undefined');
      });

      it('should return undefined for a file: url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'file:///path/to/my/page.html'
        });
        expect(htmlAsset.port, 'to be undefined');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the asset is inline', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].to.port = 'foo'),
          'to throw',
          'Cannot update the port of an inline asset'
        );
      });

      it('should update the port of the url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:123/hey/there?foo'
        });

        htmlAsset.port = 456;
        expect(
          htmlAsset.url,
          'to equal',
          'https://example.com:456/hey/there?foo'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            port: 999
          });
          expect(asset.url, 'to equal', 'https://foo.com:999/bar.js');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            port: 999
          });
          expect(
            asset.url,
            'to equal',
            `https://example.com:999/${asset.id}.js`
          );
        });
      });
    });
  });

  describe('#protocol', function() {
    describe('invoked as a getter', function() {
      it('should return the protocol of an http url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:1234/'
        });
        expect(htmlAsset.protocol, 'to equal', 'https:');
      });

      it('should return the protocol of a file url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'file:///path/to/my/page.html'
        });
        expect(htmlAsset.protocol, 'to equal', 'file:');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the asset is inline', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].to.protocol = 'foo'),
          'to throw',
          'Cannot update the protocol of an inline asset'
        );
      });

      it('should update the protocol of the url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:123/hey/there?foo'
        });

        htmlAsset.protocol = 'http:';
        expect(
          htmlAsset.url,
          'to equal',
          'http://example.com:123/hey/there?foo'
        );
      });

      it('should fill in a missing colon', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:123/hey/there?foo'
        });

        htmlAsset.protocol = 'http';
        expect(
          htmlAsset.url,
          'to equal',
          'http://example.com:123/hey/there?foo'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            protocol: 'http:'
          });
          expect(asset.url, 'to equal', 'http://foo.com/bar.js');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            protocol: 'http:'
          });
          expect(asset.url, 'to equal', `http://example.com/${asset.id}.js`);
        });
      });
    });
  });

  describe('#path', function() {
    describe('invoked as a getter', function() {
      it('should return the root-relative path from assetGraph.root when the asset is within the root', function() {
        const assetGraph = new AssetGraph({ root: 'file:///path/to/my/site/' });
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'file:///path/to/my/site/somewhere/within.html'
        });

        expect(htmlAsset.path, 'to equal', '/somewhere/');
      });

      it('should return the root-relative path when the asset is not within the root', function() {
        const assetGraph = new AssetGraph({ root: 'https://example.com/' });
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'file:///path/to/my/site/somewhere/within.html'
        });

        expect(htmlAsset.path, 'to equal', '/path/to/my/site/somewhere/');
      });

      it('should return the path of an http url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:123/hey/there?foo'
        });
        expect(htmlAsset.path, 'to equal', '/hey/');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the asset is inline', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://foobar.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].to.path = 'foo'),
          'to throw',
          'Cannot update the path of an inline asset'
        );
      });

      it('should update the root-relative path from assetGraph.root when the asset is within the root', function() {
        const assetGraph = new AssetGraph({ root: 'file:///path/to/my/site/' });
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'file:///path/to/my/site/somewhere/within.html'
        });

        htmlAsset.path = '/elsewhere/but/still/';

        expect(
          htmlAsset.url,
          'to equal',
          'file:///path/to/my/site/elsewhere/but/still/within.html'
        );
      });

      it('should update the root-relative path when the asset is not within the root', function() {
        const assetGraph = new AssetGraph({ root: 'https://example.com/' });
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'file:///path/to/my/site/somewhere/within.html'
        });

        htmlAsset.path = '/elsewhere/but/still/';

        expect(
          htmlAsset.url,
          'to equal',
          'file:///elsewhere/but/still/within.html'
        );
      });

      it('should update the path of an https url', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com:123/hey/there?foo'
        });

        htmlAsset.path = '/somewhere/else/';
        expect(
          htmlAsset.url,
          'to equal',
          'https://example.com:123/somewhere/else/there?foo'
        );
      });
    });

    describe('passed to addAsset', function() {
      describe('with a url', function() {
        it('should update the url', function() {
          const assetGraph = new AssetGraph();
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            url: 'https://foo.com/bar.js',
            path: '/blablabla/'
          });
          expect(asset.url, 'to equal', 'https://foo.com/blablabla/bar.js');
        });
      });

      describe('without a url', function() {
        it('should contribute to the default url', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            path: '/blablabla/'
          });
          expect(asset.url, 'to begin with', 'https://example.com/blablabla/');
        });

        it('should contribute to the default url and compose with fileName when path is defined before fileName', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            path: '/blablabla/',
            fileName: 'hey.js'
          });
          expect(asset.url, 'to equal', 'https://example.com/blablabla/hey.js');
        });

        it('should contribute to the default url and compose with fileName when fileName is defined before path', function() {
          const assetGraph = new AssetGraph({ root: 'https://example.com/' });
          const asset = assetGraph.addAsset({
            type: 'JavaScript',
            path: '/blablabla/',
            fileName: 'hey.js'
          });
          expect(asset.url, 'to equal', 'https://example.com/blablabla/hey.js');
        });
      });
    });
  });
});
