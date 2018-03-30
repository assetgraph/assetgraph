/*global describe, it*/
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
    const rootUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/';

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
        body: new Buffer(html)
      }
    });

    const assetGraph = new AssetGraph({ root: 'http://example.com/' });
    const warnSpy = sinon.spy().named('warn');
    assetGraph.on('warn', warnSpy);
    await assetGraph.loadAssets('/foo.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', { type: 'Html', text: html });
    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy('Invalid Content-Type response header received: &');
    });
  });
});
