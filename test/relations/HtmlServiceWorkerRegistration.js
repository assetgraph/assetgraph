/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const pathModule = require('path');

describe('relations/HtmlServiceWorkerRegistration', function() {
  function getHtmlAsset(htmlString) {
    return new AssetGraph({ root: __dirname }).addAsset({
      type: 'Html',
      text:
        htmlString || '<!doctype html><html><head></head><body></body></html>',
      url: `file://${__dirname}doesntmatter.html`
    });
  }

  describe('#inline', function() {
    it('should throw', function() {
      const relation = getHtmlAsset().addRelation({
        type: 'HtmlServiceWorkerRegistration',
        to: { url: 'index.html' }
      });

      expect(
        () => relation.inline(),
        'to throw',
        /Inlining of service worker relations is not allowed/
      );
    });
  });

  it('should handle a test case with an existing <link rel="serviceworker"> element', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlServiceWorkerRegistration/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'HtmlServiceWorkerRegistration');
    expect(assetGraph, 'to contain asset', 'JavaScript');
  });

  it('should update the href', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlServiceWorkerRegistration/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'HtmlServiceWorkerRegistration');

    const link = assetGraph.findRelations({
      type: 'HtmlServiceWorkerRegistration'
    })[0];

    link.to.url = 'foo.bar';

    expect(link, 'to satisfy', {
      href: 'foo.bar'
    });
  });

  describe('when programmatically adding a relation', function() {
    it('should attach to <head>', function() {
      const htmlAsset = getHtmlAsset();
      const relation = htmlAsset.addRelation(
        {
          type: 'HtmlServiceWorkerRegistration',
          href: 'sw.js'
        },
        'firstInHead'
      );

      expect(
        relation.node,
        'to exhaustively satisfy',
        '<link rel="serviceworker" href="sw.js">'
      );
    });

    it('should add a scope attribute', function() {
      const htmlAsset = getHtmlAsset();
      const relation = htmlAsset.addRelation(
        {
          type: 'HtmlServiceWorkerRegistration',
          href: 'sw.js',
          scope: '/'
        },
        'firstInHead'
      );

      expect(
        relation.node,
        'to exhaustively satisfy',
        '<link rel="serviceworker" href="sw.js" scope="/">'
      );
    });
  });
});
