/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    query = require('../lib').query;

describe('query', function () {
    it('should throw on error conditions', function (done) {
        expect(function andUndefined() { query.and(); }, 'to throw');
        expect(function andSingle() { query.and({}); }, 'to throw');

        expect(function orUndefined() { query.or(); }, 'to throw');
        expect(function orSingle() { query.or({}); }, 'to throw');

        expect(function notDouble() { query.not({}, {}); }, 'to throw');

        done();
    });

    it('should implement boolean AND correctly', function (done) {
        var andQuery = query.and({
            type: 'Html'
        },
            {
                isInline: false
            });

        expect(andQuery, 'to be a function');

        expect([
            {
                type: 'Html',
                isInline: false
            },
            {
                type: 'Html',
                isInline: false,
                foo: 'bar'
            },
            {
                type: 'Html',
                isInline: false,
                inline: function () { return 'foo'; }
            },
            {
                type: 'Html',
                isInline: false,
                matcher: /^http:/
            },
            {
                type: 'Html',
                isInline: false,
                amount: 10
            }
        ], 'to be an array whose items satisfy', function (item) {
            expect(andQuery(item), 'to be true');
        });

        expect([
            {
                type: 'JavaScript',
                isInline: false
            },
            {
                type: 'Css',
                isInline: false,
                foo: 'bar'
            },
            {
                type: 'HtmlTemplate',
                isInline: false,
                inline: function () { return 'foo'; }
            },
            {
                type: 'Html',
                isInline: true,
                matcher: /^http:/
            },
            {
                type: 'Xml',
                isInline: true,
                amount: 10
            }
        ], 'to be an array whose items satisfy', function (item) {
            expect(andQuery(item), 'to be false');
        });

        done();
    });

    it('should implement boolean OR correctly', function (done) {
        var orQuery = query.or({
            type: 'Html'
        },
            {
                isInline: false
            });

        expect(orQuery, 'to be a function');

        expect([
            {
                type: 'Html',
                isInline: true
            },
            {
                type: 'Html',
                isInline: false
            },
            {
                type: 'Html'
            },
            {
                isInline: false
            },
            {
                type: 'Html',
                isInline: true,
                amount: 10
            }
        ], 'to be an array whose items satisfy', function (item) {
            expect(orQuery(item), 'to be true');
        });

        expect([
            {},
            {
                type: 'JavaScript',
                isInline: true
            },
            {
                type: 'Css',
                foo: 'bar'
            },
            {
                type: 'HtmlTemplate',
                inline: function () { return 'foo'; }
            },
            {
                isInline: true,
                matcher: /^http:/
            },
            {
                type: 'Xml',
                isInline: true,
                amount: 10
            }
        ], 'to be an array whose items satisfy', function (item) {
            expect(orQuery(item), 'to be false');
        });

        done();
    });

    it('should implement boolean NOT correctly', function (done) {
        var notQuery = query.not({
            type: 'Html'
        });

        expect(notQuery, 'to be a function');

        expect([
            {},
            {
                type: 'JavaScript',
                isInline: true
            },
            {
                type: 'Css',
                foo: 'bar'
            },
            {
                type: 'HtmlTemplate',
                inline: function () { return 'foo'; }
            },
            {
                isInline: true,
                matcher: /^http:/
            },
            {
                type: 'Xml',
                isInline: true,
                amount: 10
            }
        ], 'to be an array whose items satisfy', function (item) {
            expect(notQuery(item), 'to be true');
        });

        expect([
            {
                type: 'Html',
                isInline: true
            },
            {
                type: 'Html',
                isInline: false
            },
            {
                type: 'Html'
            },
            {
                type: 'Html',
                isRepetitive: true
            },
            {
                type: 'Html',
                isInline: true,
                amount: 10
            }
        ], 'to be an array whose items satisfy', function (item) {
            expect(notQuery(item), 'to be false');
        });

        done();
    });

    it('should implement string prefix matching', function (done) {
        var prefixMatcher = query.createPrefixMatcher('http');

        expect(prefixMatcher, 'to be a function');

        expect([
            'http://fisk.dk',
            'http://cnn.com',
            'http://asetgraph.org',
            'https://github.com',
            'https://twitter.com'
        ], 'to be an array whose items satisfy', function (item) {
            expect(prefixMatcher(item), 'to be true');
        });

        expect([
            ' http://fisk.dk',
            'htp://cnn.com',
            'ftp+http://asetgraph.org',
            'ftp://github.com',
            'gopher://twitter.com'
        ], 'to be an array whose items satisfy', function (item) {
            expect(prefixMatcher(item), 'to be false');
        });

        done();
    });

    it('should implement Buffer matching', function (done) {
        var buf = new Buffer('Lorem Ipsum is simply dummy text of the printing and typesetting industry.');

        var matcher = query.createValueMatcher(buf);

        expect(Buffer.isBuffer(buf), 'to be true');
        expect(matcher, 'to be a function');

        expect(matcher(new Buffer('Lorem Ipsum is simply dummy text of the printing and typesetting industry.')), 'to be true');

        expect([
            new Buffer('Lorem Ipsum is simply dummy text of the printing and typesetting industry'),
            new Buffer('Lorem Ipsum is simply Dummy text of the printing and typesetting industry.'),
            new Buffer('lorem Ipsum is simply dummy text of the printing and typesetting industry.'),
            new Buffer('Lrem Ipsum is simply dummy text of the printing and typesetting industry.'),
            new Buffer('I am a fish!'),
            false,
            true,
            /^http:/,
            9999,
            function () { return true; },
            {}
        ], 'to be an array whose items satisfy', function (item) {
            expect(matcher(item), 'to be false');
        });

        done();
    });

    it('should should handle null input for createValueMatcher', function (done) {
        expect(query.createValueMatcher(null), 'not to throw');
        expect(query.createValueMatcher(null), 'to be a function');
        expect(query.createValueMatcher(null).name, 'to be', 'matchEqual');

        done();
    });
});
