var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

AssetGraph.registerTransform(function pushItemToArraySync(item, array) {
    return function (assetGraph) {
        array.push(item);
    };
});

AssetGraph.registerTransform(function pushItemToArrayAsync(item, array) {
    return function (assetGraph, cb) {
        process.nextTick(function () {
            array.push(item);
            cb();
        });
    };
});

vows.describe('Nested transforms').addBatch({
    'Run a test with multiple levels of nested transforms': {
        topic: function () {
            var callback = this.callback,
                array = [];
            new AssetGraph()
                .pushItemToArrayAsync('a', array)
                .pushItemToArraySync('b', array)
                .pushItemToArrayAsync('c', array)
                .pushItemToArrayAsync('d', array)
                .queue(function (assetGraph, cb) {
                    assetGraph
                        .pushItemToArrayAsync('e', array)
                        .pushItemToArraySync('f', array)
                        .pushItemToArrayAsync('g', array)
                        .pushItemToArrayAsync('h', array)
                        .queue(function (assetGraph, cb) {
                            assetGraph
                                .pushItemToArrayAsync('i', array)
                                .pushItemToArraySync('j', array)
                                .pushItemToArrayAsync('k', array)
                                .run(cb);
                        })
                        .pushItemToArrayAsync('l', array)
                        .pushItemToArraySync('m', array)
                        .pushItemToArrayAsync('n', array)
                        .queue(function (assetGraph, cb) {
                            assetGraph
                                .pushItemToArrayAsync('o', array)
                                .pushItemToArraySync('p', array)
                                .run(cb);
                        })
                        .pushItemToArraySync('q', array)
                        .pushItemToArrayAsync('r', array)
                        .run(cb);
                })
                .pushItemToArraySync('s', array)
                .pushItemToArrayAsync('t', array)
                .run(function (err) {
                    callback(err, array);
                });
        },
        'the items should be pushed in the right order': function (array) {
            expect(array, 'to equal', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't']);
        }
    }
})['export'](module);
