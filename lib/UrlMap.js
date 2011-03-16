var _ = require('underscore'),
    uglify = require('uglify-js');

// Requires: config.originalUrl (possibly containing wildcards)
// Optional: config.wildCardValueAsts
function UrlMap(config) {
    _.extend(this, config);
    this.expandedUrls = [];
    this.expandedUrlMapping = {};
}

UrlMap.prototype = {
    addExpandedUrl: function (expandedUrl) {
        this.expandedUrls.push(expandedUrl);
    },

    removeExpandedUrl: function (expandedUrl) {
        this.expandedUrls.splice(this.expandedUrls.indexOf(expandedUrl));
        delete this.expandedUrlMapping[expandedUrl];
    },

    mapExpandedUrl: function (expandedUrl, targetUrl) {
        this.expandedUrlMapping[expandedUrl] = targetUrl;
    },

    getReachableUrls: function () {
        return this.expandedUrls.map(function (expandedUrl) {
            return this.expandedUrlMapping[expandedUrl] || expandedUrl;
        }, this);
    },

    toExpressionAst: function () {
        if (this.wildCardValueAsts.length === 0) {
            return ['string', this.expandedUrlMapping[this.originalUrl] || this.originalUrl];
        } else {
            var wildCardLookupStructure = {},
                originalUrlRegExp = new RegExp("^" + this.originalUrl.replace(/\./g, "\\.").replace(/\*/g, "([^\/]+)") + "$");
            this.expandedUrls.forEach(function (expandedUrl) {
                var wildCardValues = expandedUrl.match(originalUrlRegExp).slice(1),
                    cursor = wildCardLookupStructure;
                wildCardValues.forEach(function (wildCardValue, i) {
                    if (i === wildCardValues.length - 1) {
                        cursor[wildCardValue] = this.expandedUrlMapping[expandedUrl] || expandedUrl;
                    } else {
                        if (!(wildCardValue in cursor)) {
                            cursor[wildCardValue] = {};
                        }
                        cursor = cursor[wildCardValue];
                    }
                }, this);
            }, this);
            var expressionAst = uglify.parser.parse("(" + JSON.stringify(wildCardLookupStructure) + ")")[1][0][1]; // Strip 'toplevel' and 'stat' nodes
            this.wildCardValueAsts.forEach(function (wildCardValueAst) {
                expressionAst = ['sub', expressionAst, wildCardValueAst];
            });
            return expressionAst;
        }
    }
};

// Reconstuct UrlMap from the ast output by toExpressionAst:
//
// [ 'sub'
// , [ 'sub'
//   , [ 'object'
//     , [ [ 'json'
//         , [ 'object'
//           , [ [ 'a', [ 'string', 'json/a.json' ] ]
//             , [ 'b', [ 'string', 'json/b.json' ] ]
//             ]
//           ]
//         ]
//       ]
//     ]
//   , [ 'string', 'json' ]
//   ]
// , [ 'name', 'theOneToGet' ]
// ]

UrlMap.fromExpressionAst = function (ast) {
    var wildCardValueAsts = [],
        fakeOriginalUrl = "_",
        cursor = ast;

    while (cursor[0] === 'sub') {
        wildCardValueAsts.push(cursor[2]);
        cursor = cursor[1];
        fakeOriginalUrl += "/*";
    }

    var urlMap = new UrlMap({originalUrl: fakeOriginalUrl, wildCardValueAsts: wildCardValueAsts}),
        keys = [];
    function traverse(node) {
        if (keys.length < wildCardValueAsts.length) {
            if (node && node[0] === 'object') {
                for (var i = 0 ; i < node[1].length ; i += 2) {
                    keys.push(node[1][i][0]);
                    traverse(node[1][i][1]);
                    keys.pop();
                }
            } else {
                throw new Error("Invalid getStaticUrl syntax");
            }
        } else if (node[0] === 'string') {
            var expandedUrl = ['_'].concat(keys).join("/");
            urlMap.addExpandedUrl(expandedUrl);
            urlMap.mapExpandedUrl(expandedUrl, node[1]);
        } else {
            throw new Error("Invalid getStaticUrl syntax");
        }
    }
    traverse(cursor);

    return urlMap;
};

module.exports = UrlMap;
