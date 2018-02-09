const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('transforms/inlineCssImagesPerQueryString', function() {
  it('should inline an HtmlImage', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/inlineAssetsPerQueryString/htmlImage'
      )
    });

    const htmlAsset = await assetGraph.addAsset('index.html').load();
    await assetGraph.populate();
    await assetGraph.inlineAssetsPerQueryString();

    expect(htmlAsset.text, 'to contain', '<img src="data:');
  });

  describe('when the same image has occurrences both with and without ?inline=false', function() {
    it('should not break when ?inline=false is removed', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/inlineAssetsPerQueryString/htmlImageWithAndWithoutInlineFalse'
        )
      });

      const htmlAsset = await assetGraph.addAsset('index.html').load();
      await assetGraph.populate();
      await assetGraph.inlineAssetsPerQueryString();

      expect(htmlAsset.text, 'to contain', '<img src="foo.png">').and(
        'not to contain',
        '?inline">'
      );

      // Would be nice to also be able to:
      // expect(assetGraph, 'to contain asset', 'Png');
    });
  });

  describe('with inline=false', function() {
    it('should remove the ?inline parameter from the url of the asset', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/inlineAssetsPerQueryString/htmlImageInlineFalse'
        )
      });

      const htmlAsset = await assetGraph.addAsset('index.html').load();
      await assetGraph.populate();
      await assetGraph.inlineAssetsPerQueryString();

      expect(
        htmlAsset.outgoingRelations[0].to.url,
        'not to contain',
        '?inline'
      );
    });
  });

  describe('when minimumIeVersion === 7', function() {
    it('should emit a warning when producing any data url', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/inlineAssetsPerQueryString/htmlImage'
        )
      });

      assetGraph.on('warn', warnSpy);

      await assetGraph.addAsset('index.html').load();
      await assetGraph.populate();
      await assetGraph.inlineAssetsPerQueryString(undefined, {
        minimumIeVersion: 7
      });
      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy(
          /^Inlining .*foo\.png\?inline causes the asset not to be parsed by IE7 and below$/
        );
      });
    });
  });

  describe('when minimumIeVersion === 8', function() {
    it('should emit a warning when producing a data url > 32 KB', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/inlineAssetsPerQueryString/htmlImageBig'
        )
      });

      assetGraph.on('warn', warnSpy);

      await assetGraph.addAsset('index.html').load();
      await assetGraph.populate();
      await assetGraph.inlineAssetsPerQueryString(undefined, {
        minimumIeVersion: 8
      });
      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy(
          /^Inlining .*bigimage\.png\?inline causes the asset not to be parsed by IE8 and below because the data url is > 32 KB$/
        );
      });
    });

    it('should not emit a warning when producing a data url > 32 KB inside an IE>8 conditional comment', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/inlineAssetsPerQueryString/htmlImageBigInIeGt8ConditionalComment'
        )
      });

      assetGraph.on('warn', warnSpy);

      await assetGraph.addAsset('index.html').load();
      await assetGraph.populate();
      await assetGraph.inlineAssetsPerQueryString(undefined, {
        minimumIeVersion: 8
      });
      expect(warnSpy, 'was not called');
    });

    it('should emit a warning when producing a data url > 32 KB inside an IE>=8 conditional comment', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/inlineAssetsPerQueryString/htmlImageBigInIeLte8ConditionalComment'
        )
      });

      assetGraph.on('warn', warnSpy);

      await assetGraph.addAsset('index.html').load();
      await assetGraph.populate();
      await assetGraph.inlineAssetsPerQueryString(undefined, {
        minimumIeVersion: 8
      });
      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy(
          /^Inlining .*bigimage\.png\?inline causes the asset not to be parsed by IE8 and below because the data url is > 32 KB$/
        );
      });
    });
  });

  it('should not break due to a circular reference', async function() {
    const warnSpy = sinon.spy().named('warn');
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/inlineAssetsPerQueryString/circularReference'
      )
    });
    assetGraph.on('warn', warnSpy);

    await assetGraph.addAsset('index.html').load();
    await assetGraph.populate();
    await assetGraph.inlineAssetsPerQueryString(undefined, {
      minimumIeVersion: 7
    });
    expect(warnSpy, 'was called once');
  });
});
