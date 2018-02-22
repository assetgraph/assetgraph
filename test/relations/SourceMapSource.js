/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('SourceMapFile', function() {
  describe('#attach', function() {
    it('should add the sources entry correctly when the sources array is not present', function() {
      const assetGraph = new AssetGraph();
      const sourceMap = assetGraph.addAsset({
        type: 'SourceMap',
        url: 'https://example.com/source.map',
        parseTree: {
          version: 3,
          file: 'foo.min.jsur'
        }
      });

      sourceMap.addRelation(
        {
          type: 'SourceMapSource',
          to: {
            url: 'https://example.com/myOtherSource.js'
          }
        },
        'last'
      );

      expect(sourceMap.parseTree, 'to satisfy', {
        sources: ['myOtherSource.js']
      });
    });

    it('should add the sources entry correctly when auto-creating the target asset, external case', function() {
      const assetGraph = new AssetGraph();
      const sourceMap = assetGraph.addAsset({
        type: 'SourceMap',
        url: 'https://example.com/source.map',
        parseTree: {
          version: 3,
          file: 'foo.min.jsur',
          sources: ['mySource.js']
        }
      });

      sourceMap.addRelation(
        {
          type: 'SourceMapSource',
          to: {
            url: 'https://example.com/myOtherSource.js'
          }
        },
        'last'
      );

      expect(sourceMap.parseTree, 'to satisfy', {
        sources: ['mySource.js', 'myOtherSource.js']
      });
    });

    it('should add the sources entry correctly when auto-creating the target asset, inline case', function() {
      const assetGraph = new AssetGraph();
      const sourceMap = assetGraph.addAsset({
        type: 'SourceMap',
        url: 'https://example.com/source.map',
        parseTree: {
          version: 3,
          file: 'foo.min.js',
          sources: ['mySource.js']
        }
      });

      sourceMap.addRelation(
        {
          type: 'SourceMapSource',
          to: {
            type: 'JavaScript',
            text: 'alert("foo");'
          }
        },
        'last'
      );

      expect(sourceMap.parseTree, 'to satisfy', {
        sources: [
          'mySource.js',
          'data:application/javascript,alert(%22foo%22)%3B'
        ]
      });
    });
  });
});
