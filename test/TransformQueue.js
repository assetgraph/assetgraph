/*global describe, it*/
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');
const Promise = require('bluebird');

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

AssetGraph.registerTransform(function returnPromiseDespiteBeingAsync() {
    return function (assetGraph, cb) {
        return Promise.resolve();
    };
});

describe('TransformQueue', function () {
    it('should propagate a thrown error asynchronously when an async transform throws synchronously', function () {
        return new AssetGraph()
            .throwErrorDespiteBeingAsync()
            .run(function (err) {
                expect(err, 'to equal', new Error('unnamed transform: urgh'));
            });
    });

    it('should error out when an async transform returns a promise', function () {
        return new AssetGraph()
            .returnPromiseDespiteBeingAsync()
            .run(function (err) {
                expect(err, 'to equal', new Error('unnamed transform: A transform cannot both take a callback and return a promise'));
            });
    });

    it('should support a sync (single parameter) transform returning a promise', function () {
        var promiseFulfilled = false;
        return new AssetGraph()
            .queue(function (assetGraph) {
                return new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        promiseFulfilled = true;
                        resolve();
                    }, 10);
                });
            })
            .run(function () {
                expect(promiseFulfilled, 'to be true');
            });
    });

    it('should support .then(...)', function () {
        let workDone = false;
        return new AssetGraph()
            .queue(function (assetGraph, cb) {
                setTimeout(function () {
                    workDone = true;
                    cb();
                }, 10);
            })
            .then(function () {
                expect(workDone, 'to be true');
            });
    });

    it('should support .then(..., errBack)', function () {
        return expect(
            new AssetGraph().queue(function (assetGraph) { throw new Error('aie'); }),
            'to be rejected with',
            new Error('unnamed transform: aie')
        );
    });

    it('should handle multiple levels of nested transforms', function () {
        var array = [];
        return new AssetGraph()
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
            });
    });
});
