const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const esprima = require('esprima');
const AssetGraph = require('../../lib/AssetGraph');
const _ = require('lodash');

describe('transforms/serializeSourceMaps', function() {
  describe('with a JavaScript asset with an existing source map', function() {
    it('should leave the source map alone when no manipulations have happened', async function() {
      let initialSourceMapParseTree;
      let initialSourceMapParseTreeCopy;
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/serializeSourceMaps/existingJavaScriptSourceMap/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'JavaScript', 2);
      expect(assetGraph, 'to contain asset', 'SourceMap');
      initialSourceMapParseTree = assetGraph.findAssets({
        type: 'SourceMap'
      })[0]._parseTree;
      initialSourceMapParseTreeCopy = _.clone(initialSourceMapParseTree, true);

      await assetGraph.serializeSourceMaps();

      expect(assetGraph, 'to contain asset', 'SourceMap');
      const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
      expect(sourceMap.parseTree, 'to be', initialSourceMapParseTree);
      expect(sourceMap.parseTree, 'to satisfy', initialSourceMapParseTreeCopy);
    });

    it('should update the source map when manipulations have happened', async function() {
      let initialSourceMapParseTree;
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/serializeSourceMaps/existingJavaScriptSourceMap/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'JavaScript', 2);
      expect(assetGraph, 'to contain asset', 'SourceMap');
      initialSourceMapParseTree = assetGraph.findAssets({
        type: 'SourceMap'
      })[0]._parseTree;
      const javaScript = assetGraph.findAssets({
        fileName: 'jquery-1.10.1.min.js'
      })[0];
      javaScript.parseTree.body.push(
        esprima.parse('var bogus = 123;', {
          loc: true,
          attachComment: true,
          source: `${assetGraph.root}bogus.js`
        }).body[0]
      );
      javaScript.markDirty();

      await assetGraph.serializeSourceMaps();

      expect(assetGraph, 'to contain asset', 'SourceMap');
      const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
      expect(sourceMap.parseTree, 'not to be', initialSourceMapParseTree);
      expect(JSON.parse(sourceMap.text), 'to satisfy', {
        sources: expect.it('to contain', `${assetGraph.root}bogus.js`)
      });
    });
  });

  describe('with a JavaScript asset that has no existing source map', function() {
    it('should not add a source map when no manipulations have happened', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/serializeSourceMaps/noExistingJavaScriptSourceMap/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(assetGraph, 'to contain no assets', 'SourceMap');

      await assetGraph.serializeSourceMaps();

      expect(assetGraph, 'to contain no assets', 'SourceMap');
    });

    it('should add a source map when manipulations have happened', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/serializeSourceMaps/noExistingJavaScriptSourceMap/'
        )
      });
      await assetGraph.loadAssets('index.html', 'bogus.js');
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'JavaScript', 2);
      expect(assetGraph, 'to contain no assets', 'SourceMap');
      const javaScript = assetGraph.findAssets({ fileName: 'myScript.js' })[0];
      const bogusJs = assetGraph.findAssets({ fileName: 'bogus.js' })[0];
      javaScript.parseTree.body.splice(2, 0, bogusJs.parseTree.body[0]);
      assetGraph.removeAsset(bogusJs);
      javaScript.markDirty();

      await assetGraph.serializeSourceMaps();

      expect(assetGraph, 'to contain asset', 'SourceMap');
      const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
      expect(
        assetGraph.findAssets({ fileName: 'myScript.js' })[0].text,
        'to contain',
        '//# sourceMappingURL=myScript.js.map'
      );
      expect(JSON.parse(sourceMap.text), 'to satisfy', {
        sources: [`${assetGraph.root}myScript.js`, `${assetGraph.root}bogus.js`]
      });
    });

    it('should preserve the sourcesContent property when manipulations have happened and options.sourcesContent is provided', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/serializeSourceMaps/existingJavaScriptSourceMapWithSourcesContent/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.applySourceMaps();
      await assetGraph.serializeSourceMaps({ sourcesContent: true });

      expect(assetGraph, 'to contain asset', 'SourceMap');
      const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
      expect(sourceMap.parseTree.sourcesContent, 'to equal', ['foo']);
    });

    it('should retain the source mapping info when cloning an asset', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/serializeSourceMaps/noExistingJavaScriptSourceMap/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      const myScript = assetGraph.findAssets({ fileName: 'myScript.js' })[0];
      myScript.parseTree.body.push(
        esprima.parse('var bogus = 123;', {
          loc: true,
          attachComment: true,
          source: `${assetGraph.root}bogus.js`
        }).body[0]
      );
      myScript.markDirty();
      const clonedMyScript = myScript.clone(myScript.incomingRelations);
      assetGraph.removeAsset(myScript);
      clonedMyScript.url = `${assetGraph.root}clonedMyScript.js`;

      await assetGraph.serializeSourceMaps();

      const sourceMap = assetGraph.findRelations({
        from: { fileName: 'clonedMyScript.js' },
        to: { type: 'SourceMap' }
      })[0].to;
      expect(JSON.parse(sourceMap.text), 'to satisfy', {
        sources: expect.it('to contain', `${assetGraph.root}bogus.js`)
      });
    });
  });
});
