const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const pathModule = require('path');

describe('transforms/setHtmlImageDimensions', function() {
  it('should handle a simple test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/setHtmlImageDimensions/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.setHtmlImageDimensions();

    let node = assetGraph.findRelations({
      type: 'HtmlImage',
      to: { fileName: 'foo.png' }
    })[0].node;
    expect(node.getAttribute('width'), 'to equal', '12');
    expect(node.getAttribute('height'), 'to equal', '5');

    node = assetGraph.findRelations({
      type: 'HtmlImage',
      to: { fileName: 'bar.jpg' }
    })[0].node;
    expect(node.getAttribute('width'), 'to equal', '20');
    expect(node.getAttribute('height'), 'to equal', '20');

    node = assetGraph.findRelations({
      type: 'HtmlImage',
      to: { fileName: 'quux.gif' }
    })[0].node;
    expect(node.getAttribute('width'), 'to equal', '15');
    expect(node.getAttribute('height'), 'to equal', '15');

    const htmlImages = assetGraph.findRelations({
      type: 'HtmlImage',
      to: { fileName: 'foo.png' }
    });
    expect(htmlImages[1].node.hasAttribute('height'), 'to equal', false);
    expect(htmlImages[1].node.getAttribute('width'), 'to equal', '123');
    expect(htmlImages[2].node.hasAttribute('width'), 'to equal', false);
    expect(htmlImages[2].node.getAttribute('height'), 'to equal', '123');
    expect(htmlImages[3].node.getAttribute('width'), 'to equal', '123');
    expect(htmlImages[3].node.getAttribute('height'), 'to equal', '123');

    const svgHtmlImages = assetGraph.findRelations({
      type: 'HtmlImage',
      to: { type: 'Svg' }
    });
    expect(svgHtmlImages[0].node.getAttribute('width'), 'to equal', '612');
    expect(svgHtmlImages[0].node.getAttribute('height'), 'to equal', '502.174');
  });
});
