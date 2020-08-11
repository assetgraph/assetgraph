const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlInlineScriptTemplate', function () {
  it('should handle a test case with an existing <script type="text/html"> element', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlInlineScriptTemplate/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 2);
    expect(assetGraph, 'to contain assets', 'Html', 2);
    expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
    expect(
      assetGraph.findRelations({ type: 'HtmlInlineScriptTemplate' })[0].to.text,
      'to equal',
      '<div></div>'
    );
    const inlineHtml = assetGraph.findAssets({
      type: 'Html',
      isInline: true,
    })[0];
    const document = inlineHtml.parseTree;
    document.firstChild.appendChild(document.createTextNode('hello!'));
    inlineHtml.markDirty();

    expect(
      assetGraph.findAssets({ type: 'Html', isInline: false })[0].text,
      'to match',
      /<div>hello!<\/div>/
    );
  });

  it('should handle a test case with some advanced markup in a <script type="text/html"> element', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlInlineScriptTemplate/'
      ),
    });
    await assetGraph.loadAssets('advancedMarkup.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'Html', 2);
    expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
    expect(
      assetGraph.findRelations({ type: 'HtmlInlineScriptTemplate' })[0].to.text,
      'to equal',
      "\n<div>foo<!--ko 'if':true-->bar<!--/ko-->quux</div>\n"
    );

    const inlineHtml = assetGraph.findAssets({
      type: 'Html',
      isInline: true,
    })[0];
    const document = inlineHtml.parseTree;
    document.appendChild(document.createTextNode('hello!'));
    inlineHtml.markDirty();

    expect(
      assetGraph.findAssets({ type: 'Html', isInline: false })[0].text,
      'to match',
      /hello!/
    );
  });
});
