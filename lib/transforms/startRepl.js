var Repl = require('repl');
var Promise = require('bluebird');

module.exports = function (prompt) {
    return function startRepl(assetGraph, cb) {
        var repl = Repl.start({prompt: prompt || 'assetGraph> '});
        repl.context.assetGraph = assetGraph;
        return new Promise(function (resolve, reject) {
            repl.on('error', function (err) {
                assetGraph.emit('warn', err);
            }).on('exit', resolve);
        });
    };
};
