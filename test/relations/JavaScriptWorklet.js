const pathModule = require('path');
/* global describe, it */
const sinon = require('sinon');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

const testRoot = pathModule.resolve(
  __dirname,
  '../../testdata/relations/JavaScriptWorklet'
);

describe('relations/JavaScriptWorklet', function() {
  it('should detect a root-relative path', async function() {
    const assetGraph = new AssetGraph({
      root: `${testRoot}/default`
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    expect(assetGraph, 'to contain relation', 'JavaScriptWorklet');
  });

  it('should read the href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: `${testRoot}/default`
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const relation = assetGraph.findRelations({ type: 'JavaScriptWorklet' })[0];

    expect(relation, 'to satisfy', {
      href: '/js/paintworklet.js',
      to: {
        path: '/js/',
        fileName: 'paintworklet.js'
      }
    });
  });

  it('should write the href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: `${testRoot}/default`
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const relation = assetGraph.findRelations({ type: 'JavaScriptWorklet' })[0];

    expect(relation, 'to satisfy', {
      href: '/js/paintworklet.js',
      to: {
        path: '/js/',
        fileName: 'paintworklet.js'
      },
      from: {
        text: expect.it('not to contain', 'movedWorklet.js')
      }
    });

    relation.to.fileName = 'movedWorklet.js';

    expect(relation, 'to satisfy', {
      href: '/js/movedWorklet.js',
      to: {
        path: '/js/',
        fileName: 'movedWorklet.js'
      },
      from: {
        text: expect.it('to contain', 'movedWorklet.js')
      }
    });
  });

  it('should warn when parsing a relative href', async function() {
    const warnSpy = sinon.spy();
    const assetGraph = new AssetGraph({
      root: `${testRoot}/relativeRelation`
    });
    await assetGraph.on('warn', warnSpy);

    await assetGraph.loadAssets('js/index.js');

    expect(warnSpy, 'to have calls satisfying', function () {
      warnSpy({
        message: expect.it('to start with', 'Using a relative URL when adding a worklet can cause problems'),
        asset: {
          type: 'JavaScript',
          fileName: 'index.js'
        },
        line: 1,
        column: 27
      })
    });
  });

  it('should inline as data-uri', async function() {
    const assetGraph = new AssetGraph({
      root: `${testRoot}/default`
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const relation = assetGraph.findRelations({ type: 'JavaScriptWorklet' })[0];

    relation.inline();

    expect(relation.to, 'to satisfy', {
      isInline: true
    });

    expect(relation.from, 'to satisfy', {
      text: `CSS.paintWorklet.addModule("data:application/javascript,console.log('I%20am%20a%20worklet')%0A");`
    });
  });

  it('should throw when detaching', async function() {
    const assetGraph = new AssetGraph({
      root: `${testRoot}/default`
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const relation = assetGraph.findRelations({ type: 'JavaScriptWorklet' })[0];

    expect(
      function() {
        relation.detach();
      },
      'to throw',
      'JavaScriptWorklet.detach(): Not implemented'
    );
  });

  it('should throw when attaching', async function() {
    const assetGraph = new AssetGraph({
      root: `${testRoot}/default`
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const relation = assetGraph.findRelations({ type: 'JavaScriptWorklet' })[0];

    expect(
      function() {
        relation.attach('before', relation);
      },
      'to throw',
      'JavaScriptWorklet.attach(): Not implemented'
    );
  });
});
