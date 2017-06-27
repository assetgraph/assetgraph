/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/addDataVersionAttributeToHtmlElement', function () {
    it('should add the specified data-version tag', function () {
        return new AssetGraph()
            .queue(assetGraph => {
                assetGraph.addAsset(new AssetGraph.Html({
                    url: 'http://example.com/index.html',
                    text: '<!DOCTYPE html><html><head></head><body></body></html>'
                }));
            })
            .addDataVersionAttributeToHtmlElement({type: 'Html'}, 'theDataVersionTag')
            .queue(assetGraph => {
                expect(
                    assetGraph.findAssets({url: 'http://example.com/index.html'})[0].text,
                    'to contain',
                    '<!DOCTYPE html><html data-version="theDataVersionTag"><head></head><body></body></html>'
                );
            });
    });

    it('should use git-describe to retrieve a suitable version tag if none is given', function () {
        return new AssetGraph()
            .queue(assetGraph => {
                assetGraph.addAsset(new AssetGraph.Html({
                    url: 'http://example.com/index.html',
                    text: '<!DOCTYPE html><html><head></head><body></body></html>'
                }));
            })
            .addDataVersionAttributeToHtmlElement({type: 'Html'})
            .queue(assetGraph => {
                expect(
                    assetGraph.findAssets({url: 'http://example.com/index.html'})[0].text,
                    'to contain',
                    '<!DOCTYPE html><html data-version="v'
                );
            });
    });
});
