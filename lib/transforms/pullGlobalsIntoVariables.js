var _ = require('underscore'),
    uglifyJs = require('uglify-js');

module.exports = function (queryObj, globalNames) {
    globalNames = globalNames || ['eval', 'clearInterval', 'clearTimeout', 'document', 'event', 'frames', 'history', 'Image', 'localStorage', 'location', 'name', 'navigator', 'Option', 'parent', 'screen', 'sessionStorage', 'setInterval', 'setTimeout', 'Storage', 'window', 'XMLHttpRequest', 'Math', 'Math.min', 'Math.max', 'Math.round', 'Function', 'Date', 'Math.E', 'Math.LN2', 'Math.LN10', 'Math.LOG2E', 'Math.LOG10E', 'Math.PI', 'Math.SQRT1_2', 'Math.SQRT2', 'Math.abs', 'Math.acos', 'Math.asin', 'Math.atan', 'Math.atan2', 'Math.ceil', 'Math.cos', 'Math.exp', 'Math.floor', 'Math.log', 'Math.max', 'Math.min', 'Math.pow', 'Math.random', 'Math.round', 'Math.sin', 'Math.sqrt', 'Math.tan', 'parseInt', 'parseFloat'];
    var globalsObj = {};
    globalNames.forEach(function (global) {
        globalsObj[global] = true;
    });
    return function pullGlobalsIntoVariables(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScriptAsset) {
            var occurrencesByGlobalName = {},
                ast = javaScriptAsset.parseTree,
                walker = uglifyJs.uglify.ast_walker(),
                seenNames = {}; // To avoid collisions when introducing new vars
            walker.with_walkers({
                dot: function () {
                    var stack = walker.stack(),
                        node = stack[stack.length - 1],
                        name = uglifyJs.uglify.gen_code(node);
                    if (name in globalsObj) {
                        if (!occurrencesByGlobalName.hasOwnProperty(name)) {
                            occurrencesByGlobalName[name] = [];
                        }
                        occurrencesByGlobalName[name].push(node);
                    }
                },
                var: function (vars) {
                    vars.forEach(function (v) {
                        seenNames[v[0]] = true;
                    });
                },
                name: function (name) {
                    seenNames[name] = true;
                    if (name in globalsObj) {
                        var stack = walker.stack(),
                            node = stack[stack.length - 1];
                        if (!occurrencesByGlobalName.hasOwnProperty(name)) {
                            occurrencesByGlobalName[name] = [];
                        }
                        occurrencesByGlobalName[name].push(node);
                    }
                }
            }, function() {
                walker.walk(ast);
            });
            // Order by number of dots ascending so e.g. Math is considered before Math.min:
            var globalNames = Object.keys(occurrencesByGlobalName).sort(function (a, b) {
                return a.split('.').length - b.split('.').length;
            });
            var aliasDeclarationAsts = [],
                aliasByGlobalName = {};

            function nameToAst(name) {
                name = (aliasByGlobalName.hasOwnProperty(name) && aliasByGlobalName[name]) || name;
                var nameFragments = name.split('.');
                if (nameFragments.length > 1) {
                    return ['dot', nameToAst(nameFragments.slice(0, nameFragments.length - 1).join('.')), nameFragments[nameFragments.length - 1]];
                } else {
                    return ['name', nameFragments[0]];
                }
            }

            globalNames.forEach(function (globalName) {
                if (occurrencesByGlobalName[globalName].length > 1) {
                    var alias = globalName.replace(/\./g, '').toUpperCase();
                    while (seenNames.hasOwnProperty(alias)) {
                        alias += '_';
                    }
                    seenNames[alias] = true;
                    aliasDeclarationAsts.push(["var", [[alias, nameToAst(globalName)]]]);
                    occurrencesByGlobalName[globalName].forEach(function (occurrence) {
                        occurrence.splice(0, occurrence.length, 'name', alias);
                    });
                    aliasByGlobalName[globalName] = alias;
                } else {
                    delete occurrencesByGlobalName[globalName];
                }
            });
            if (aliasDeclarationAsts.length) {
                Array.prototype.unshift.apply(ast[1], aliasDeclarationAsts);
                javaScriptAsset.markDirty();
            }
        });
    };
};
