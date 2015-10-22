/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
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

AssetGraph.registerTransform(function throwErrorDespiteBeingAsync() {
    return function (assetGraph, cb) {
        throw new Error('urgh');
    };
});

describe('TransformQueue', function () {
    it('should propagate a thrown error asynchronously when an async transform throws synchronously' , function (done) {
        new AssetGraph()
            .throwErrorDespiteBeingAsync()
            .run(function (err) {
                expect(err, 'to equal', new Error('unnamed transform: urgh'));
                done();
            });
    });

    it('should handle multiple levels of nested transforms', function (done) {
        var array = [];
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
            .queue(function () {
                expect(array, 'to equal', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't']);
            })
            .run(done);
    });
});
