const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('relations/HtmlApplicationManifest', function() {
  it('should handle a test case with an existing <link rel="manifest">', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 1);
    expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
  });

  it('should read the link href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    const relation = assetGraph.findRelations({
      type: 'HtmlApplicationManifest'
    })[0];

    expect(relation, 'to satisfy', { href: 'manifest.json' });
  });

  it('should write the link href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    const relation = assetGraph.findRelations({
      type: 'HtmlApplicationManifest'
    })[0];

    relation.to.url = 'foo.json';

    expect(relation, 'to satisfy', { href: 'foo.json' });

    relation.href = 'bar.json';

    expect(relation, 'to satisfy', { href: 'bar.json' });
  });

  it('should append <link rel="manifest"> to a containing document', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    const html = assetGraph.findAssets({ type: 'Html' })[0];
    const adjacentRelation = assetGraph.findRelations({
      type: 'HtmlApplicationManifest'
    })[0];

    html.addRelation(
      {
        type: 'HtmlApplicationManifest',
        to: {
          type: 'ApplicationManifest',
          url: 'attach.json',
          parseTree: { name: 'attach' }
        }
      },
      'before',
      adjacentRelation
    );

    expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 2);
  });

  it('should warn when there are multiple application manifests linked from the same document', async function() {
    const warnSpy = sinon.spy().named('warn');

    await new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlApplicationManifest/'
      )
    })
      .on('warn', warnSpy)
      .loadAssets({
        type: 'Html',
        text:
          '<html><head><link rel="manifest" href="manifest.json"><link rel="manifest" href="manifest.json"></head><body></body></html>'
      })
      .populate();

    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy({ message: /^Multiple ApplicationManifest relations/ });
    });
  });
});
