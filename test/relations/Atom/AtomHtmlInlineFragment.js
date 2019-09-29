const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/AtomHtmlInlineFragment', function() {
  it('should handle a test case with an atom feed with a <content> tag', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Atom/AtomHtmlInlineFragment/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 4);
    expect(assetGraph, 'to contain assets', 'Html', 2);
    expect(assetGraph, 'to contain asset', 'Atom');
    expect(assetGraph, 'to contain asset', 'Png');
    expect(assetGraph, 'to contain relation', 'AtomHtmlInlineFragment');

    const atom = assetGraph.findAssets({ type: 'Atom' })[0];
    const fragmentRelation = assetGraph.findRelations({
      type: 'AtomHtmlInlineFragment'
    })[0];

    expect(
      fragmentRelation.to.text,
      'to equal',
      'This contains an image: <img src="foo.png">'
    );

    assetGraph.findAssets({ type: 'Png' })[0].fileName = 'bar.png';

    expect(
      fragmentRelation.to.text,
      'to equal',
      'This contains an image: <img src="bar.png">'
    );
    expect(
      atom.text,
      'to equal',
      `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>The title</title>
    <link href="http://example.com"/>
    <updated>2019-09-16T23:51:55+02:00</updated>
    <id>http://yeoman.io/blog/generator-karma-rewrite</id>
    <content type="html">This contains an image: &lt;img src="bar.png"&gt;</content>
  </entry>
</feed>`
    );
  });
});
