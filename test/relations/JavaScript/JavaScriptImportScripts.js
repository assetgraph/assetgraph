const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('JavaScriptImportScripts', function() {
  it('should pick up importScripts() and self.importScripts as relations', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptImportScripts/simple/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'JavaScript', 5);
  });

  it('should support attaching and detaching importScripts relations', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptImportScripts/simple/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    assetGraph.findRelations({ to: { fileName: 'foo.js' } })[0].detach();
    const webWorker = assetGraph.findRelations({
      type: 'JavaScriptWebWorker'
    })[0].to;
    expect(webWorker.text, 'not to contain', "'foo.js';");
    expect(webWorker.text, 'to contain', "importScripts('bar.js');");
    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        to: { url: 'foo.js' }
      },
      'before',
      assetGraph.findRelations({
        type: 'JavaScriptImportScripts',
        to: { fileName: 'bar.js' }
      })[0]
    );
    expect(webWorker.text, 'to contain', "importScripts('foo.js', 'bar.js');");

    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'after.js'
      },
      'after',
      assetGraph.findRelations({
        type: 'JavaScriptImportScripts',
        to: { fileName: 'bar.js' }
      })[0]
    );
    expect(
      webWorker.text,
      'to contain',
      "importScripts('foo.js', 'bar.js', 'after.js')"
    );
    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'last.js'
      },
      'last'
    );
    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'first.js'
      },
      'first'
    );
    expect(webWorker.text, 'to begin with', "importScripts('first.js');").and(
      'to end with',
      "importScripts('last.js');"
    );
  });

  it('should support attaching and detaching importScripts separated by comma in the source file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptImportScripts/seq/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    assetGraph.findRelations({ to: { fileName: 'foo.js' } })[0].detach();
    const webWorker = assetGraph.findRelations({
      type: 'JavaScriptWebWorker'
    })[0].to;
    expect(webWorker.text, 'not to contain', "'foo.js';");
    expect(webWorker.text, 'to contain', "importScripts('bar.js')");
    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'foo.js'
      },
      'before',
      assetGraph.findRelations({
        type: 'JavaScriptImportScripts',
        to: { fileName: 'bar.js' }
      })[0]
    );
    expect(webWorker.text, 'to contain', "importScripts('foo.js', 'bar.js')");

    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'after.js'
      },
      'after',
      assetGraph.findRelations({
        type: 'JavaScriptImportScripts',
        to: { fileName: 'bar.js' }
      })[0]
    );
    expect(
      webWorker.text,
      'to contain',
      "importScripts('foo.js', 'bar.js', 'after.js')"
    );
    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'last.js'
      },
      'last'
    );
    webWorker.addRelation(
      {
        type: 'JavaScriptImportScripts',
        href: 'first.js'
      },
      'first'
    );
    expect(webWorker.text, 'to begin with', "importScripts('first.js');").and(
      'to end with',
      "importScripts('last.js');"
    );
  });

  it('should refuse to inline, attach and detach', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptImportScripts/simple/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const javaScriptImportScripts = assetGraph.findRelations({
      type: 'JavaScriptImportScripts'
    })[0];
    expect(
      function() {
        javaScriptImportScripts.inline();
      },
      'to throw',
      /Not supported/
    );

    expect(
      function() {
        javaScriptImportScripts.node = {};
        javaScriptImportScripts.detach();
      },
      'to throw',
      'relations.JavaScriptWebWorker.detach: this.node not found in module array of this.arrayNode.'
    );

    expect(
      function() {
        javaScriptImportScripts.attach('after', { argumentsNode: [] });
      },
      'to throw',
      'JavaScriptImportScripts.attach: adjacentRelation.node not found in adjacentRelation.argumentsNode'
    );

    expect(
      function() {
        javaScriptImportScripts.attach('foobar');
      },
      'to throw',
      "JavaScriptImportScripts.attach: Unsupported 'position' value: foobar"
    );
  });
});
