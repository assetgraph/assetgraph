var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    assets = AssetGraph.assets,
    relations = AssetGraph.relations,
    query = AssetGraph.query;

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph()
                .loadAssets(
                    new assets.Html({url: 'a', text: 'a', foo: 'bar'}),
                    new assets.Html({url: 'b', text: 'b', foo: 'bar'}),
                    new assets.Html({url: 'c', text: 'c', foo: 'quux'}),
                    new assets.Css({url: 'd', text: 'd', foo: 'baz'}),
                    new assets.Css({url: 'e', text: 'e'}),
                    new assets.Png({url: 'f', rawSrc: new Buffer('f'), foo: 'baz'})
                )
                .queue(
                    function (assetGraph) {
                        assetGraph.addRelation(new relations.HtmlStyle({
                            from: assetGraph.findAssets({text: 'a'})[0],
                            to: assetGraph.findAssets({text: 'd'})[0]
                        }));
                        assetGraph.addRelation(new relations.HtmlAnchor({
                            from: assetGraph.findAssets({text: 'a'})[0],
                            to: assetGraph.findAssets({text: 'b'})[0]
                        }));
                        assetGraph.addRelation(new relations.HtmlAnchor({
                            from: assetGraph.findAssets({text: 'a'})[0],
                            to: assetGraph.findAssets({text: 'c'})[0]
                        }));
                        assetGraph.addRelation(new relations.HtmlAnchor({
                            from: assetGraph.findAssets({text: 'b'})[0],
                            to: assetGraph.findAssets({text: 'c'})[0]
                        }));
                        assetGraph.addRelation(new relations.HtmlStyle({
                            from: assetGraph.findAssets({text: 'b'})[0],
                            to: assetGraph.findAssets({text: 'e'})[0]
                        }));
                        assetGraph.addRelation(new relations.CssImage({
                            from: assetGraph.findAssets({text: 'd'})[0],
                            to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
                        }));
                        assetGraph.addRelation(new relations.CssImage({
                            from: assetGraph.findAssets({text: 'e'})[0],
                            to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
                        }));
                    }
                )
                .run(this.callback);
        },
        'and lookup relations by a single indexed property': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 2);
        },
        'and lookup relations by multiple indexed properties': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HtmlAnchor',
                from: assetGraph.findAssets({text: 'a'})[0]
            }).length, 2);
        },
        'and lookup relations by structured query': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HtmlAnchor',
                to: {
                    text: 'c',
                    foo: 'quux'
                }
            }).length, 2);
        },
        'and lookup relations by structured query with arrays': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: ['HtmlAnchor', 'HtmlStyle'],
                from: {
                    text: ['a', 'b']
                },
                to: {
                    type: ['Html', 'Css']
                }
            }).length, 5);
        },
        'and lookup relations by structured query with regexps': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: /CssIm|HtmlAn/,
                from: {
                    text: /^[ad]$/
                }
            }).length, 3);
            assert.equal(assetGraph.findRelations({
                type: /Style/,
                from: {
                    text: /^a$/
                }
            }).length, 1);
        },
        'and lookup relations by negative match': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: query.not('CssImage'),
                from: {
                    text: query.not('a')
                }
            }).length, 2);
        },
        'and lookup relations by definedness': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                from: {
                    foo: function (val) {return typeof val !== 'undefined';}
                }
            }).length, 6);
            assert.equal(assetGraph.findRelations({
                from: {
                    foo: function (val) {return typeof val === 'undefined';}
                }
            }).length, 1);
        }
    }
})['export'](module);
