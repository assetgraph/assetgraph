/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('assets/Svg', function () {
    it('should handle a combo test case with an Svg asset', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Svg/combo/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 11);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain assets', 'Png', 2);
                expect(assetGraph, 'to contain asset', 'Xslt');
                expect(assetGraph, 'to contain relation', 'SvgImage');
                expect(assetGraph, 'to contain relation', 'SvgScript');
                expect(assetGraph, 'to contain relation', 'SvgStyleAttribute');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain relation', 'SvgStyle');
                expect(assetGraph, 'to contain relation', 'SvgFontFaceUri');
                expect(assetGraph, 'to contain relations', 'XmlStylesheet', 2);
                expect(assetGraph, 'to contain relation', 'SvgInlineEventHandler');
                expect(assetGraph, 'to contain relation', 'SvgAnchor');

                var svgImage = assetGraph.findRelations({type: 'SvgImage'})[0];
                expect(svgImage.href, 'to equal', 'foo.png');
                svgImage.to.url = assetGraph.resolveUrl(assetGraph.root, 'bar.png');
                var svg = assetGraph.findAssets({type: 'Svg'})[0];
                expect(svg.text, 'to match', /<image[^>]* xlink:href="bar\.png"\/>/);

                var svgScript = assetGraph.findRelations({type: 'SvgScript'})[0];
                svgScript.to.url = assetGraph.resolveUrl(assetGraph.root, 'hey.js');
                expect(svg.text, 'to match', /<script[^>]* xlink:href="hey\.js"\/>/);
                svgScript.inline();
                expect(svg.text, 'not to match', /<script[^>]* xlink:href="hey\.js"/);

                var svgAnchor = assetGraph.findRelations({type: 'SvgAnchor'})[0];
                expect(svgAnchor.href, 'to equal', 'index.html');
                svgAnchor.to.url = assetGraph.resolveUrl(assetGraph.root, 'hello.html');
                expect(svg.text, 'to match', /<a[^>]* xlink:href="hello\.html"/);

                var svgFontFaceUri = assetGraph.findRelations({type: 'SvgFontFaceUri'})[0];
                expect(svgFontFaceUri.href, 'to equal', 'fontawesome-webfont.ttf');
                svgFontFaceUri.to.url = assetGraph.resolveUrl(assetGraph.root, 'notsoawesome.ttf');
                expect(svg.text, 'to match', /<font-face-uri[^>]* xlink:href="notsoawesome\.ttf"/);
            })
            .run(done);
    });

    it('should inline an Svg asset as a non-base64 data: url', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Svg/inline/'})
            .loadAssets('index.css')
            .populate()
            .inlineRelations({type: 'CssImage'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to equal', 'body{background-image:url(\'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%20standalone%3D%22no%22%3F%3E%0A%3Csvg%20xmlns%3Asvg%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M%20200%20200%20L%20201.359%20203.311%20L%20202.447%20197.072%20L%20201.244%20190.529%20L%20207.094%20191.356%20L%20210.21%20185.648%20L%20213.884%20193.027%20L%20207.693%20191.885%20L%20213.931%20186.541%20L%20213.601%20187.882%20L%20220.888%20180.667%20L%20217.386%20186.535%20L%20211.136%20190.972%20L%20211.537%20190.357%20L%20207.733%20195.063%20L%20207.399%20189.115%20L%20205.406%20188.851%20L%20206.217%20195.309%20L%20209.377%20202.344%20L%20214.324%20196.943%20L%20210.493%20201.625%20L%20216.78%20199.377%20L%20213.469%20192.906%20L%20210.799%20199.214%20L%20205.389%20198.94%20L%20208.676%20204.205%20L%20214.787%20202.954%20L%20212.99%20202.483%20L%20206.28%20196.725%20L%20199.028%20189.907%20L%20201.733%20185.316%20L%20202.391%20184.188%20L%20201.334%20177.443%20L%20203.549%20174.04%20L%20199.22%20180.984%20L%20195.72%20183.249%20L%20194.214%20180.879%20L%20195.267%20176.523%20L%20197.781%20181.169%20L%20192.608%20181.93%20L%20190.102%20177.307%20L%20192.746%20172.05%20L%20190.553%20175.704%20L%20193.352%20179.301%20L%20196.153%20179.538%20L%20201.966%20177.599%20L%20194.471%20172.555%20L%20197.509%20175.249%20L%20201.847%20169.083%20L%20204.036%20172.533%20L%20199.966%20168.455%20L%20204.721%20165.428%20L%20199.725%20158.755%20L%20193.774%20164.334%20L%20197.677%20161.672%20L%20199.741%20164.875%20L%20198.642%20163.351%20L%20194.184%20165.864%20L%20191.855%20162.654%20L%20185.925%20162.993%20L%20180.621%20161.558%20L%20184.871%20155.936%20L%20177.701%20150.547%20L%20180.333%20153.014%20L%20184.613%20159.563%20L%20180.62%20165.308%20L%20179.951%20169.438%20L%20182.54%20173.689%20L%20180.346%20170.804%20L%20178.585%20169.216%20L%20176.076%20167.942%20L%20173.636%20169.266%20L%20168.154%20162.932%20L%20172.16%20166.174%20L%20171.318%20160.673%20L%20173.817%20158.262%20L%20181.114%20162.959%20L%20178.918%20168.024%20L%20173.816%20173.4%20L%20176.237%20179.271%20L%20171.048%20172.435%20L%20173.936%20167.902%20L%20169.527%20161.114%20L%20162.383%20159.322%20L%20158.767%20164.91%20L%20159.067%20158.463%20L%20155.947%20151.81%20L%20152.074%20149.407%20L%20151.055%20148.798%20L%20152.406%20154.174%20L%20150.426%20156.541%20L%20150.021%20150.581%20L%20145.626%20147.003%20L%20141.154%20149.424%20L%20148.692%20143.329%20L%20148.04%20142.635%20L%20154.703%20136.503%20L%20155.467%20129.387%20L%20152.31%20130.051%20L%20152.171%20131.508%20L%20153.293%20137.974%20L%20160.128%20144.383%20L%20160.362%20142.344%20L%20166.171%20148.564%20L%20167.512%20148.85%20L%20169.037%20146.204%20L%20166.241%20139.393%20L%20171.957%20142.669%20L%20165.748%20145.946%20L%20165.454%20143.199%20L%20167.083%20138.861%20L%20172.013%20142.527%20L%20170.501%20140.347%20L%20171.543%20133.833%20L%20167.235%20137.982%20L%20169.266%20137.717%20L%20168.953%20141.083%20L%20166.003%20143.682%22%20fill%3D%22yellow%22%20stroke%3D%22blue%22%20stroke-width%3D%225%22%20%2F%3E%0A%3C%2Fsvg%3E%0A\')}');
            })
            .run(done);
    });
});
