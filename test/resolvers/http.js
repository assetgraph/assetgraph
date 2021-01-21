const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const http = require('http');
const httpception = require('httpception');
const sinon = require('sinon');

describe('resolvers/http', function() {
  it('should resolve an http url and load an asset', async function() {
    const server = http
      .createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=UTF-8'
        });
        res.end('Foo');
      })
      .listen(0);
    const serverAddress = server.address();
    const serverHostname =
      serverAddress.address === '::' ? 'localhost' : serverAddress.address;
    const rootUrl = `http://${serverHostname}:${serverAddress.port}/`;

    const assetGraph = new AssetGraph({ root: rootUrl });

    expect(assetGraph.root, 'to equal', rootUrl);

    await assetGraph.loadAssets('/foo.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', { type: 'Html', text: 'Foo' });
    server.close();
  });

  it('should retry once encountering a self-redirect', async function() {
    httpception([
      {
        request: 'GET http://example.com/',
        response: {
          statusCode: 301,
          headers: { Location: 'http://example.com/' }
        }
      },
      {
        request: 'GET http://example.com/',
        response: {
          headers: 'Content-Type: text/html; charset=UTF-8',
          body: '<!DOCTYPE html><html><head></head><body>Hey!</body></html>'
        }
      }
    ]);

    const assetGraph = new AssetGraph({ root: 'http://example.com/' });

    assetGraph.requestOptions = { numRetries: 1 };

    await assetGraph.loadAssets('/');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Html');
  });

  it('should disregard the fragment identifier of both the asset being loaded and the Location header when deciding whether it is a self-redirect', async function() {
    httpception([
      {
        request: 'GET http://example.com/',
        response: {
          statusCode: 301,
          headers: { Location: 'http://example.com/#bar' }
        }
      },
      {
        request: 'GET http://example.com/',
        response: {
          headers: 'Content-Type: text/html; charset=UTF-8',
          body: '<!DOCTYPE html><html><head></head><body>Hey!</body></html>'
        }
      }
    ]);

    const assetGraph = new AssetGraph({ root: 'http://example.com/' });

    assetGraph.requestOptions = { numRetries: 1 };

    await assetGraph.loadAssets('/#foo');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Html');
  });

  it('should not provide metadata.contentType when the Content-Type header cannot be parsed, thus falling back to parsing the extension', async function() {
    const html =
      '<!DOCTYPE html>\n<html><head></head><body><p>Hello, world</p></body></html>';

    httpception({
      request: 'GET http://example.com/foo.html',
      response: {
        statusCode: 200,
        headers: 'Content-Type: &',
        body: Buffer.from(html)
      }
    });

    const assetGraph = new AssetGraph({ root: 'http://example.com/' });
    const warnSpy = sinon.spy().named('warn');
    assetGraph.on('warn', warnSpy);
    await assetGraph.loadAssets('/foo.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', {
      type: 'Html',
      url: 'http://example.com/foo.html'
    });
    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy('Invalid Content-Type response header received: &');
    });
  });

  // Regression test for https://github.com/assetgraph/assetgraph/issues/1144
  it('should not break when a url contains curly braces', async function() {
    httpception({
      request:
        'GET https://api.amplitude.com/httpapi?api_key=e102edba5e9caea6b89e3c04fac87a4d&event={%22event_type%22:%22Overall%20Active%20User%22,%22event_properties%22:{%22Email%20Send%20Time%22:%222019-05-10T10:43:42%22,%22Current%20Date%22:%2210/05/2019%22,%22UserId%22:5698327,%22campaign%22:%22Daily%20Digest%22,%22Platform%22:%22E-Mail%22},%22user_id%22:%225698327%22}',
      response: {
        statusCode: 200,
        body: '<html><body>Hello, world!</body></html>'
      }
    });

    const assetGraph = new AssetGraph();
    const warnSpy = sinon.spy().named('warn');
    assetGraph.on('warn', warnSpy);
    await assetGraph.loadAssets(
      'https://api.amplitude.com/httpapi?api_key=e102edba5e9caea6b89e3c04fac87a4d&event={%22event_type%22:%22Overall%20Active%20User%22,%22event_properties%22:{%22Email%20Send%20Time%22:%222019-05-10T10:43:42%22,%22Current%20Date%22:%2210/05/2019%22,%22UserId%22:5698327,%22campaign%22:%22Daily%20Digest%22,%22Platform%22:%22E-Mail%22},%22user_id%22:%225698327%22}'
    );
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', {
      type: 'Html',
      url:
        'https://api.amplitude.com/httpapi?api_key=e102edba5e9caea6b89e3c04fac87a4d&event={%22event_type%22:%22Overall%20Active%20User%22,%22event_properties%22:{%22Email%20Send%20Time%22:%222019-05-10T10:43:42%22,%22Current%20Date%22:%2210/05/2019%22,%22UserId%22:5698327,%22campaign%22:%22Daily%20Digest%22,%22Platform%22:%22E-Mail%22},%22user_id%22:%225698327%22}'
    });
  });
});
