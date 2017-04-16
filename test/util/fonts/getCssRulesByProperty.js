var expect = require('unexpected');
var getRules = require('../../../lib/util/fonts/getCssRulesByProperty');
var postCss = require('postcss');

describe('utils/fonts/getCssRulesByProperty', function () {
    it('should throw when not passing an array of properties as first argument', function () {
        expect(getRules, 'to throw', 'properties argument must be an array');
    });

    it('should throw when not passing a parsetree as second argument', function () {
        expect(function () { getRules(['padding']); }, 'to throw', 'parseTree argument must be a postcss parse result');
    });

    it('should return empty arrays when no properties apply', function () {
        var parseTree = postCss.parse('h1 { color: red; }');

        expect(getRules(['padding'], parseTree), 'to exhaustively satisfy', {
            padding: []
        });
    });

    it('should return an array of matching property values', function () {
        var parseTree = postCss.parse('h1 { color: red; } h2 { color: blue; }');

        expect(getRules(['color'], parseTree), 'to exhaustively satisfy', {
            color: [
                {
                    selector: 'h1',
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'red',
                    inlineStyle: false,
                    important: false
                },
                {
                    selector: 'h2',
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'blue',
                    inlineStyle: false,
                    important: false
                }
            ]
        });
    });
});
