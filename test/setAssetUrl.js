var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    SiteGraph = require('../lib/SiteGraph'),
    transforms = require('../lib/transforms');

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new SiteGraph({root: __dirname + '/setAssetUrl/'}).applyTransform(
                transforms.addInitialAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph should contain 3 assets': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 3);
        },
        'the graph should contain 2 HTML files': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'HTML').length, 2);
        },
        'the graph should contain one PNG asset': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 1);
        },
        'then moving the first HTML asset one level down:': {
            topic: function (siteGraph) {
                var initialHTML = siteGraph.findAssets('type', 'HTML')[0];
                siteGraph.setAssetUrl(initialHTML, siteGraph.root + 'bogus/index.html');
                return siteGraph;
            },
            'the relative url of the anchor relation should have changed': function (siteGraph) {
                var relativeUrl = siteGraph.findRelations('type', 'HTMLAnchor')[0].node.getAttribute('href');
                assert.equal(relativeUrl, '../otherpage.html');
            },
            'then moving the other page one level down': {
                topic: function (siteGraph) {
                    var otherHTML = siteGraph.findAssets('type', 'HTML')[1];
                    siteGraph.setAssetUrl(otherHTML, siteGraph.root + 'fluff/otherpage.html');
                    return siteGraph;
                },
                'the relative url of the anchor relation should be updated': function (siteGraph) {
                    var relativeUrl = siteGraph.findRelations('type', 'HTMLAnchor')[0].node.getAttribute('href');
                    assert.equal(relativeUrl, '../fluff/otherpage.html');
                },
                'the relative url of the image relation should be updated': function (siteGraph) {
                    var relativeUrl = siteGraph.findRelations('type', 'HTMLImage')[0].node.getAttribute('src');
                    assert.equal(relativeUrl, '../foo.png');
                }
            }
        }
    }
})['export'](module);
