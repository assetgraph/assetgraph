const Repl = require('repl');
const Promise = require('bluebird');
const open = require('open');

function quoteRegExpMetaChars(str) {
  return str.replace(/[\\|.+*{}[]()?^$]/g, '\\$&');
}

function htmlEncode(str) {
  return str.replace(/</g, '&lt;');
}

module.exports = options => {
  if (typeof options === 'string') {
    options = { prompt: options };
  } else {
    options = options || {};
  }
  return async function startRepl(assetGraph) {
    const repl = Repl.start({ prompt: options.prompt || 'assetGraph> ' });
    repl.context.assetGraph = assetGraph;
    let server;
    if (options.server) {
      server = require('http').createServer((req, res) => {
        let foundAsset;
        if (/\/$/.test(req.url)) {
          const prefixUrl = assetGraph.root + req.url.substr(1);
          foundAsset = assetGraph.findAssets({
            url: `${prefixUrl}index.html`
          })[0];
          if (!foundAsset) {
            const title = `Index of ${prefixUrl}`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.write(
              `<!DOCTYPE html><html><head><title>${htmlEncode(
                title
              )}</title></head><body><h1>${htmlEncode(title)}</h1>`
            );
            const assetsInDirectory = assetGraph.findAssets({
              url: new RegExp(`^${quoteRegExpMetaChars(prefixUrl)}`)
            });
            if (assetsInDirectory.length > 0) {
              const isSubdirectoryByHref = {};
              const immediateChildren = [];
              for (const asset of assetsInDirectory) {
                const relativeUrl = asset.url.replace(prefixUrl, '');
                const indexOfSlash = relativeUrl.indexOf('/');
                if (indexOfSlash === -1) {
                  immediateChildren.push(asset);
                } else {
                  isSubdirectoryByHref[
                    relativeUrl.substr(0, indexOfSlash)
                  ] = true;
                }
              }
              res.write('<ul>');
              for (const subdirectoryHref of Object.keys(
                isSubdirectoryByHref
              )) {
                res.write(
                  `<li><a href="${htmlEncode(subdirectoryHref)}/">${htmlEncode(
                    decodeURIComponent(subdirectoryHref)
                  )}</a></li>`
                );
              }
              for (const asset of immediateChildren) {
                res.write(
                  `<li><a href="${htmlEncode(
                    asset.url.replace(prefixUrl, '')
                  )}">${htmlEncode(
                    decodeURIComponent(asset.url.replace(prefixUrl, ''))
                  )}</a></li>`
                );
              }
              res.write('</ul>');
            } else {
              res.write('<h2>No entries found</h1>');
            }
            return res.end('</body></html>');
          }
        }
        foundAsset =
          foundAsset ||
          assetGraph.findAssets({
            isLoaded: true,
            url: assetGraph.root + req.url.substr(1)
          })[0];
        if (foundAsset) {
          const etag = `"${foundAsset.md5Hex}"`;
          res.setHeader('ETag', etag);
          res.setHeader('Content-Type', foundAsset.contentType);
          const rawSrc = foundAsset.rawSrc;
          res.setHeader('Content-Length', String(foundAsset.rawSrc.length));
          if (
            req.headers['if-none-match'] &&
            req.headers['if-none-match'].includes(etag)
          ) {
            res.writeHead(304);
            res.end();
          } else {
            res.end(rawSrc);
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      server.listen(0, () => {
        let url = `http://localhost:${server.address().port}/`;
        const initialAssetsAtRoot = assetGraph
          .findAssets({ isInitial: true, isInline: false })
          .filter(initialAsset => {
            return (
              initialAsset.url.indexOf(assetGraph.root) === 0 &&
              initialAsset.url.indexOf('/', assetGraph.root.length + 1) === -1
            );
          });
        if (initialAssetsAtRoot.length === 1) {
          url += initialAssetsAtRoot[0].url.replace(assetGraph.root, '');
        }
        open(url);
      });
    }

    try {
      await new Promise(resolve => {
        repl.on('error', err => assetGraph.warn(err)).on('exit', resolve);
      });
    } finally {
      if (server) {
        server.close();
      }
    }
  };
};
