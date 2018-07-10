const AssetGraph = require('../../lib/AssetGraph');
const httpception = require('httpception');
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');

describe('checkIncompatibleTypes', function() {
  it('should not complain if an HTTP redirect with a Content-Type conflicts with the expected type', async function() {
    const assetGraph = new AssetGraph();
    httpception({
      request: 'GET https://www.example.com/foo.js',
      response: {
        statusCode: 302,
        headers: {
          'Content-Type': 'text/html',
          Location: 'https://www.example.com/otherScript.js'
        },
        body: 'Sorry, please get the script from over there'
      }
    });

    await assetGraph.loadAssets('https://www.example.com/foo.js');

    const warnSpy = sinon.spy();
    assetGraph.on('warn', warnSpy);
    await assetGraph.checkIncompatibleTypes();
    expect(warnSpy, 'was not called');
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
    await htmlAsset.outgoingRelations[0].to.load();
    const warnSpy = sinon.spy();
    assetGraph.on('warn', warnSpy);
    await assetGraph.checkIncompatibleTypes();
    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy('Asset is used as both JavaScript and Png');
    });
  });

  it('should warn if an asset is being used in incompatible contexts', async function() {
    const assetGraph = new AssetGraph();

    const undetectableAsset = assetGraph.addAsset({
      url: 'http://example.com/undetectable',
      text: '/* foo */'
    });

    assetGraph.addAsset({
      type: 'Html',
      url: 'http://example.com/',
      text: `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="undetectable">
        </head>
        <body>
            <script src="undetectable"></script>
        </body>
        </html>
      `
    });

    await undetectableAsset.load();

    const warnSpy = sinon.spy().named('warn');
    assetGraph.on('warn', warnSpy);
    await assetGraph.checkIncompatibleTypes();

    expect(warnSpy, 'to have calls satisfying', () => {
      const err = new Error('Asset is used as both Css and JavaScript');
      err.asset = undetectableAsset;
      warnSpy(err);
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
    await htmlAsset.outgoingRelations[0].to.load();
    const warnSpy = sinon.spy();
    assetGraph.on('warn', warnSpy);
    await assetGraph.checkIncompatibleTypes();
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
            sources: ['/a.less'],
            names: [],
            mappings:
              'AAAA;EACE,eAAe;EACf,sBAAsB;CACvB;AACD;EACE,+CAA+C;EAC/C,uCAAuC;CACxC',
            file: 'styles.css'
          }
        }
      }
    ]);
    const assetGraph = new AssetGraph();
    await assetGraph.loadAssets('https://example.com/styles.css');
    await assetGraph.populate({
      followRelations: { type: 'CssSourceMappingUrl' }
    });
    const warnSpy = sinon.spy();
    assetGraph.on('warn', warnSpy);
    await assetGraph.checkIncompatibleTypes();
    expect(warnSpy, 'was not called');
  });
});
