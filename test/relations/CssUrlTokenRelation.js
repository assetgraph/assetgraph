var unexpected = require('../unexpected-with-plugins');
var CssUrlTokenRelation = require('../../lib/relations/CssUrlTokenRelation');

describe('CssUrlTokenRelation', function () {
    describe('#findUrlsInPropertyValue', function () {
        var expect = unexpected.clone().addAssertion('<string> to come out as <array|string>', function (expect, subject, value) {
            if (!Array.isArray(value)) {
                value = [ value ];
            }
            return expect(CssUrlTokenRelation.prototype.findUrlsInPropertyValue(subject), 'to equal', value);
        });

        it('should allow escaped doublequotes in a singlequoted value', function () {
            expect("url('fo\\\"o')", 'to come out as', 'fo"o');
        });

        it('should allow escaped singlequotes in a singlequoted value', function () {
            expect("url('fo\\\'o')", 'to come out as', "fo'o");
        });

        it('should allow escaped singlequotes in a doublequoted value', function () {
            expect('url("fo\\\'o")', 'to come out as', "fo'o");
        });

        it('should allow escaped doublequotes in a doublequoted value', function () {
            expect('url("fo\\"o")', 'to come out as', 'fo"o');
        });

        it('should trim space around the url', function () {
            expect('url( foo )', 'to come out as', 'foo');
        });

        it('should allow other escaped characters inside a singlequoted value', function () {
            expect("url('foo\\)')", 'to come out as', 'foo)');
        });

        it('should allow other escaped characters inside an unquoted value', function () {
            expect("url(foo\\$)", 'to come out as', 'foo$');
        });

        it('should allow an escaped end paren inside a unquoted value', function () {
            expect("url(foo\\)bar)", 'to come out as', 'foo)bar');
        });

        it('should allow an escaped single quote inside a unquoted value', function () {
            expect("url(foo\\'bar)", 'to come out as', "foo'bar");
        });

        // At least this isn't supported by Chrome's CSS parser:
        it('should ignore a url(...) token with an unescaped single quote inside a unquoted value', function () {
            expect("url(foo'bar)", 'to come out as', []);
        });
    });
});
