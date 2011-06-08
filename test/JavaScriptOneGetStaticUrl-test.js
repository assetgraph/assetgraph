var vows = require('vows'),
    assert = require('assert'),
    uglify = require('uglify-js'),
    AssetGraph = require('../lib/AssetGraph'),
    relations = AssetGraph.relations;

vows.describe('one.getStaticUrl').addBatch({
    'UrlMap with wildcards': {
        topic: function () {
            var urlMap = new relations.JavaScriptOneGetStaticUrl.UrlMap({
                originalUrl: 'file:///foo/*/*.json',
                wildCardValueAsts: [
                    uglify.parser.parse('(b || "abc")')[1][0][1], // strip 'toplevel' and 'stat' nodes
                    uglify.parser.parse('(a < 10 ? 123 : (a < 100 ? 456 : 789))')[1][0][1]
                ]
            });
            urlMap.addExpandedUrl('file:///foo/abc/123.json');
            urlMap.addExpandedUrl('file:///foo/abc/456.json');
            urlMap.addExpandedUrl('file:///foo/def/789.json');
            urlMap.addExpandedUrl('file:///foo/ghi/123.json');
            urlMap.mapExpandedUrl('file:///foo/def/789.json', 'bogus');
            return urlMap.toExpressionAst();
        },
        'should DTRT': function (expressionAst) {
            var src = uglify.uglify.gen_code(expressionAst);
            assert.equal(new Function('var a = 4, b = false; return ' + src + ';')(), 'file:///foo/abc/123.json');
            assert.equal(new Function('var a = 50, b = false; return ' + src + ';')(), 'file:///foo/abc/456.json');
            assert.equal(new Function('var a = 150, b = "def"; return ' + src + ';')(), 'bogus');
        }
    }
})['export'](module);
