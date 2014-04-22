var REPL = require('repl');

module.exports = function (prompt) {
    return function startRepl(assetGraph, cb) {
        var repl = REPL.start({prompt: prompt || 'assetGraph> '});
        repl.context.assetGraph = assetGraph;
        repl.on('error', function (err) {
            assetGraph.emit('warn', err);
        }).on('exit', cb);
    };
};
