/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlInlineFragment', function () {
    it('should handle a test case with an RSS feed with a <description> tag', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlInlineFragment/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 5);
                expect(assetGraph, 'to contain assets', 'Html', 3);
                expect(assetGraph, 'to contain assets', 'Rss', 1);
                expect(assetGraph, 'to contain assets', 'Png', 1);
                expect(assetGraph, 'to contain relation', 'XmlHtmlInlineFragment');

                var rss = assetGraph.findAssets({ type: 'Rss' })[0];
                var fragmentRelation = assetGraph.findRelations({type: 'XmlHtmlInlineFragment'})[0];

                expect(fragmentRelation.to.text, 'to equal', 'Here is some text containing an interesting description and an image: <img src="foo.png">.');

                assetGraph.findAssets({ type: 'Png' })[0].fileName = 'bar.png';

                expect(fragmentRelation.to.text, 'to equal', 'Here is some text containing an interesting description and an image: <img src="bar.png">.');
                expect(rss.text, 'to equal', '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0">\n<channel>\n <title>RSS Title</title>\n <description>This is an example of an RSS feed</description>\n <link>http://www.someexamplerssdomain.com/main.html</link>\n <lastBuildDate>Mon, 06 Sep 2010 00:01:00 +0000 </lastBuildDate>\n <pubDate>Mon, 06 Sep 2009 16:20:00 +0000 </pubDate>\n <ttl>1800</ttl>\n <item>\n  <title>Example entry</title>\n  <description>Here is some text containing an interesting description and an image: &lt;img src="bar.png">.</description>\n  <link>http://www.wikipedia.org/</link>\n  <guid>unique string per item</guid>\n  <pubDate>Mon, 06 Sep 2009 16:20:00 +0000 </pubDate>\n </item>\n</channel>\n</rss>');
            })
            .run(done);
    });
});
