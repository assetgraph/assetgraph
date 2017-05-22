var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/AssetGraph');

describe('updateAssets', function () {
    describe('without the deep flag', function () {
        it('updates the properties of the found assets shallowly', function () {
            return new AssetGraph()
                .loadAssets({
                    type: 'Json',
                    parseTree: {
                        foo: {
                            bar: 123,
                            quux: 456
                        }
                    }
                })
                .updateAssets({type: 'Json'}, {
                    parseTree: {
                        baz: 123,
                        foo: {
                            bar: 789
                        }
                    }
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'Json'})[0], 'to satisfy', {
                        parseTree: {
                            baz: 123,
                            foo: {
                                bar: 789
                            }
                        }
                    });
                });
        });
    });

    describe('with the deep flag', function () {
        it('updates the properties of the found assets deeply', function () {
            return new AssetGraph()
                .loadAssets({
                    type: 'Json',
                    parseTree: {
                        foo: {
                            bar: 123,
                            quux: 456
                        }
                    }
                })
                .updateAssets({type: 'Json'}, {
                    parseTree: {
                        baz: 123,
                        foo: {
                            bar: 789
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
            it('updates the properties of the found assets deeply', function () {
                return new AssetGraph()
                    .loadAssets({
                        type: 'Json',
                        parseTree: {
                            foo: {
                                bar: 123,
                                quux: 456
                            }
                        }
                    })
                    .updateAssets({type: 'Json'}, {
                        parseTree: {
                            baz: 123,
                            foo: {
                                bar: 789
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
