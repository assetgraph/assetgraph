/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const http = require('http');

describe('relations/HtmlMetaRefresh', function() {
  it('should handle a basic test case', async function() {
    let serverAddress;
    let rootUrl;
    const server = http
      .createServer((req, res) => {
        if (req.url === '/metaRefresh') {
          res.writeHead(302, {
            'Content-Type': 'text/html; charset=UTF-8'
          });
          res.end(
            '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="5; url=/metaRefreshTarget.html"></head><html>Moved temporarily</body></html>'
          );
        } else if (/\/.*Target\.html$/.test(req.url)) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=UTF-8'
          });
          res.end(`This is ${req.url}`);
        } else {
          res.writeHead(404);
          res.end();
        }
      })
      .listen(0);

    serverAddress = server.address();
    rootUrl = `http://${
      serverAddress.address === '::' ? 'localhost' : serverAddress.address
    }:${serverAddress.port}/`;

    const assetGraph = new AssetGraph({ root: rootUrl });

    await assetGraph.loadAssets('/metaRefresh');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'Html', 2);
    expect(assetGraph, 'to contain relations', 'HtmlMetaRefresh', 1);
    server.close();
  });
});
