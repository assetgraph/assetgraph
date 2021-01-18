const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const http = require('http');

describe('relations/HttpRedirect', function() {
  it('should handle a basic test case', async function() {
    let serverAddress;
    let rootUrl;
    let loopCount = 0;
    let infiniteloopCount = 0;
    const server = http
      .createServer((req, res) => {
        const number = parseInt(req.url.substr(1));
        if (!isNaN(number)) {
          if (req.url.endsWith('Target.html')) {
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=UTF-8'
            });
            res.end(`This is ${req.url}`);
          } else {
            res.writeHead(number, {
              Location:
                number === 301 || number === 308
                  ? `/${number}Target.html`
                  : `${rootUrl}${number}Target.html`,
              'Content-Type': 'text/html; charset=UTF-8'
            });
            res.end(
              `<!DOCTYPE html><html><head></head><html>${number} redirect</body></html>`
            );
          }
        } else if (req.url === '/infiniteloop') {
          infiniteloopCount += 1;
          res.writeHead(302, {
            Location: `${rootUrl}infiniteloop`,
            'Content-Type': 'text/html; charset=UTF-8'
          });
          res.end(
            '<!DOCTYPE html><html><head></head><html>Moved temporarily</body></html>'
          );
        } else if (req.url === '/loop') {
          if (loopCount === 0) {
            loopCount += 1;
            res.writeHead(302, {
              Location: `${rootUrl}loop`,
              'Content-Type': 'text/html; charset=UTF-8'
            });
            res.end(
              '<!DOCTYPE html><html><head></head><html>Moved temporarily</body></html>'
            );
          } else {
            res.writeHead(301, {
              Location: '/loopRedirectTarget.html',
              'Content-Type': 'text/html; charset=UTF-8'
            });
            res.end(
              '<!DOCTYPE html><html><head></head><html>Moved permanently</body></html>'
            );
          }
        } else if (req.url === '/loopRedirectTarget.html') {
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

    try {
      serverAddress = server.address();
      const serverHostname =
        serverAddress.address === '::' ? 'localhost' : serverAddress.address;
      rootUrl = `http://${serverHostname}:${serverAddress.port}/`;

      const assetGraph = new AssetGraph({ root: rootUrl });
      assetGraph.requestOptions = { numRetries: 1 };

      await assetGraph.loadAssets(
        '/301',
        '/302',
        '/303',
        '/307',
        '/308',
        '/loop',
        '/infiniteloop'
      );
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'Html', 13);
      expect(assetGraph, 'to contain assets', { statusCode: 301 }, 2);
      expect(assetGraph, 'to contain assets', { statusCode: 302 }, 2);
      expect(assetGraph, 'to contain assets', { statusCode: 303 }, 1);
      expect(assetGraph, 'to contain assets', { statusCode: 307 }, 1);
      expect(assetGraph, 'to contain assets', { statusCode: 308 }, 1);
      expect(assetGraph, 'to contain relations', 'HttpRedirect', 7);
      const httpRedirects = assetGraph.findRelations({ type: 'HttpRedirect' });
      expect(httpRedirects, 'to satisfy', [
        { href: '/301Target.html' },
        { href: `${rootUrl}302Target.html` },
        { href: `${rootUrl}303Target.html` },
        { href: `${rootUrl}307Target.html` },
        { href: `/308Target.html` },
        { href: '/loopRedirectTarget.html' },
        { href: `${rootUrl}infiniteloop` }
      ]);
      expect(loopCount, 'to be', 1);
      expect(infiniteloopCount, 'to be', 2);
    } finally {
      server.close();
    }
  });
});
