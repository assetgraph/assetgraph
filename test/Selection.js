/*global describe, it*/
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');

describe('Selection', function() {
  let assetGraph, cssAsset1, cssAsset2;
  beforeEach(function() {
    assetGraph = new AssetGraph();
    cssAsset1 = assetGraph.addAsset({
      url: 'https://example.com/styles1.css',
      text: 'body { color:maroon }'
    });
    cssAsset2 = assetGraph.addAsset({
      url: 'https://example.com/styles2.css',
      text: 'body { color:tan }'
    });
  });

  it('should be iterable (as always)', function() {
    const foundAssets = [];
    for (const asset of assetGraph.findAssets({ type: 'Css' })) {
      foundAssets.push(asset);
    }

    expect(foundAssets, 'to equal', [cssAsset1, cssAsset2]);
  });

  it('should call a method on all the contained assets', function() {
    assetGraph.findAssets({ type: 'Css' }).prettyPrint();

    expect(cssAsset1.text, 'to equal', 'body {\n    color: maroon;\n}\n');
    expect(cssAsset2.text, 'to equal', 'body {\n    color: tan;\n}\n');
  });

  it('should call a getter on all the contained assets', function() {
    expect(assetGraph.findAssets({ type: 'Css' }).text, 'to equal', [
      'body { color:maroon }',
      'body { color:tan }'
    ]);
  });

  it('should call a setter on all the contained assets', function() {
    assetGraph.findAssets({ type: 'Css' }).text = 'div { color: teal }';

    expect(cssAsset1.text, 'to equal', 'div { color: teal }');
    expect(cssAsset2.text, 'to equal', 'div { color: teal }');
  });

  describe('with an async method', function() {
    it('should call an async method on all the contained assets and return a single promise', async function() {
      await assetGraph.findAssets({ type: 'Css' }).minify();

      expect(cssAsset1.text, 'to equal', 'body{color:maroon}');
      expect(cssAsset2.text, 'to equal', 'body{color:tan}');
    });

    describe('that fulfills with a value', function() {
      beforeEach(function() {
        AssetGraph.Css.prototype.foo = async function() {
          return this.text.length;
        };
      });

      afterEach(function() {
        delete AssetGraph.Css.prototype.foo;
      });

      it('should fulfill with an array of the fulfillment values', async function() {
        expect(await assetGraph.findAssets({ type: 'Css' }).foo(), 'to equal', [
          21,
          18
        ]);
      });
    });
  });

  describe('with transforms', function() {
    it('should call a transform scoped to the contained assets', function() {
      assetGraph.findAssets({ type: 'Css' }).moveAssets('/foobar/');

      expect(
        cssAsset1.url,
        'to equal',
        'https://example.com/foobar/styles1.css'
      );
      expect(
        cssAsset2.url,
        'to equal',
        'https://example.com/foobar/styles2.css'
      );
    });

    it('should call a transform scoped to the contained assets', async function() {
      AssetGraph.registerTransform(assetGraph => {
        for (const asset of assetGraph) {
          asset.text += 'div { background-color: yellow }';
        }
      }, 'foobar');

      await assetGraph.findAssets({ fileName: 'styles1.css' }).foobar();
      expect(
        cssAsset1.text,
        'to equal',
        'div { color: teal }div { background-color: yellow }'
      );
      expect(cssAsset2.text, 'to equal', 'div { color: teal }');
    });
  });
});
