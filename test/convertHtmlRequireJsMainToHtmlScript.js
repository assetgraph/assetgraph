var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    AssetGraph = require('../lib');

describe('convertHtmlRequireJsMainToHtmlScript', function () {
    it('should convert the data-main attribute to a separate HtmlScript relation', function (done) {
        new AssetGraph({root: __dirname + '/convertHtmlRequireJsMainToHtmlScript/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain relation', 'HtmlRequireJsMain');
                expect(assetGraph, 'to contain relation', 'HtmlScript');
            })
            .convertHtmlRequireJsMainToHtmlScript()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain no relations', {type: 'HtmlRequireJsMain'});
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to equal', '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n    <script src="jquery-require.js"></script><script src="main.js"></script>\n</body>\n</html>\n');
            })
            .run(done);
    });
});
