var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/');

describe('updateRelations', function () {
    describe('without the deep flag', function () {
        it('updates the properties of the found relations deeply', function () {
            return new AssetGraph()
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com/',
                    text: '<a href="http://example.com/foo.json"></a>'
                }, {
                    type: 'Json',
                    url: 'http://example.com/foo.json',
                    parseTree: {
                        foo: {
                            bar: 123,
                            quux: 456
                        }
                    }
                })
                .populate()
                .updateRelations({}, {
                    to: {
                        url: 'http://somewhereelse.com/'
                    }
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({}, true)[0].to, 'to equal', {
                        url: 'http://somewhereelse.com/'
                    });
                });
        });
    });

    describe('with the deep flag', function () {
        it('updates the properties of the found relations deeply', function () {
            return new AssetGraph()
                .loadAssets({
                    type: 'Html',
                    url: 'http://example.com/',
                    text: '<a href="http://example.com/foo.json"></a>'
                }, {
                    type: 'Json',
                    url: 'http://example.com/foo.json',
                    parseTree: {
                        foo: {
                            bar: 123,
                            quux: 456
                        }
                    }
                })
                .populate()
                .updateRelations({}, {
                    to: {
                        parseTree: {
                            baz: 123,
                            foo: {
                                bar: 789
                            }
                        }
                    }
                }, { deep: true })
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'Json'})[0], 'to satisfy', {
                        parseTree: {
                            baz: 123,
                            foo: {
                                bar: 789,
                                quux: 456
                            }
                        }
                    });
                });
        });

        describe('passed as a boolean', function () {
            it('updates the properties of the found relations deeply', function () {
                return new AssetGraph()
                    .loadAssets({
                        type: 'Html',
                        url: 'http://example.com/',
                        text: '<a href="http://example.com/foo.json"></a>'
                    }, {
                        type: 'Json',
                        url: 'http://example.com/foo.json',
                        parseTree: {
                            foo: {
                                bar: 123,
                                quux: 456
                            }
                        }
                    })
                    .populate()
                    .updateRelations({}, {
                        to: {
                            parseTree: {
                                baz: 123,
                                foo: {
                                    bar: 789
                                }
                            }
                        }
                    }, true)
                    .queue(function (assetGraph) {
                        expect(assetGraph.findAssets({type: 'Json'})[0], 'to satisfy', {
                            parseTree: {
                                baz: 123,
                                foo: {
                                    bar: 789,
                                    quux: 456
                                }
                            }
                        });
                    });
            });
        });
    });
});
