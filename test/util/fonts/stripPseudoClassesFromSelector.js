var expect = require('unexpected');
var strip = require('../../../lib/util/fonts/stripPseudoClassesFromSelector');

describe('stripPseudoClassesFromSelector', function () {
    it('should replace pseudo class selectors at the beginning of a string with *', function () {
        expect(strip(':hover'), 'to be', '*');
    });

    describe('combinators', function () {
        it('should replace pseudo class selectors after a decendant combinator with *', function () {
            expect(strip('div :hover'), 'to be', 'div *');
        });

        it('should replace pseudo class selectors after a child combinator with *', function () {
            expect(strip('div>:hover'), 'to be', 'div>*');
        });

        it('should replace pseudo class selectors after a next-sibling combinator with *', function () {
            expect(strip('div+:hover'), 'to be', 'div+*');
        });

        it('should replace pseudo class selectors after a following-sibling combinator with *', function () {
            expect(strip('div~:hover'), 'to be', 'div~*');
        });

        it('should replace pseudo class selectors after a reference combinator with *', function () {
            expect(strip('div/foo/:hover'), 'to be', 'div/foo/*');
        });
    });

    it('should replace pseudo class selectors directly following a selector with nothing', function () {
        expect(strip('div:hover'), 'to be', 'div');
    });

    it('should replace pseudo class selectors directly following an attribute selector with nothing', function () {
        expect(strip('div[foo="bar"]:hover'), 'to be', 'div[foo="bar"]');
    });

    it('should replace multiple consecutive pseudo class selectors directly following a selector with nothing', function () {
        expect(strip('div:hover:focus:visited'), 'to be', 'div');
    });
});
