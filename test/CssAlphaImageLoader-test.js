var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

vows.describe('CssAlphaImageLoader').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssAlphaImageLoader/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 CssAlphaImageLoader relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssAlphaImageLoader', 3);
        },
        'then move foo.png': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/foo.png$/})[0].url = assetGraph.root + 'images/quux.png';
                return assetGraph;
            },
            'the href properties of the relations should be updated': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'CssAlphaImageLoader'}), 'href'), 'to equal',
                                 [
                                     'images/quux.png',
                                     'bar.png',
                                     '/images/quux.png'
                                 ]);
            },
            'the CSS values should be updated accordingly': function (assetGraph) {
                var cssRules = assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules;
                expect(cssRules[0].style.getPropertyValue('filter'), 'to match', /src='images\/quux\.png'.*src='bar\.png'/);
                expect(cssRules[1].style.getPropertyValue('filter'), 'to match', /src='\/images\/quux\.png'/);
            }
        }
    }
})['export'](module);
