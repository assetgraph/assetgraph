const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/JavaScriptFetch', function () {
  it('should not populate dynamic endpoints', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('dynamic.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 0);
    expect(assetGraph, 'to contain assets', 'JavaScript', 1);
  });

  it('should populate naked fetch', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('fetch.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
  });

  it('should populate window.fetch', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('windowFetch.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
  });

  it('should populate a sequence fetch', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('sequenceFetch.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
  });

  it('should read the href correctly', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('fetch.js');

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

    const relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

    expect(relation, 'to satisfy', {
      href: 'b.js',
    });
  });

  it('should write the href correctly', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('fetch.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

    const relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

    expect(relation, 'to satisfy', {
      href: 'b.js',
      from: {
        text: expect.it('not to contain', 'static/b.js'),
      },
    });

    relation.to.url = 'static/b.js';

    expect(relation, 'to satisfy', {
      href: 'static/b.js',
      from: {
        text: expect.it('to contain', 'static/b.js'),
      },
    });
  });

  it('should inline as data-uri', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('fetch.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

    const relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

    relation.inline();

    expect(relation.from, 'to satisfy', {
      text: `fetch("data:application/javascript,module.exports%20%3D%20'fetched'%3B%0A");`,
    });
  });

  it('should throw when detaching', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('a.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

    const relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

    expect(
      function () {
        relation.detach();
      },
      'to throw',
      'JavaScriptFetch.detach(): Not implemented'
    );
  });

  it('should throw when attaching', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptFetch'
      ),
    });
    await assetGraph.loadAssets('a.js');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

    const relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

    expect(
      function () {
        relation.attach('before', relation);
      },
      'to throw',
      'JavaScriptFetch.attach(): Not implemented'
    );
  });
});
