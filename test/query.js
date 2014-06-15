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
});
