/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    query = require('../lib').query;

describe('query', function () {
    it('it should throw on error conditions', function (done) {
        expect(function andUndefined() { query.and(); }, 'to throw');
        expect(function andSingle() { query.and({}); }, 'to throw');

        expect(function orUndefined() { query.or(); }, 'to throw');
        expect(function orSingle() { query.or({}); }, 'to throw');

        expect(function notDouble() { query.not({}, {}); }, 'to throw');

        done();
    });

    it ('it should implement boolean AND correctly', function (done) {
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
});
