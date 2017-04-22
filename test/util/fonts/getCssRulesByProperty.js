var expect = require('unexpected');
var getRules = require('../../../lib/util/fonts/getCssRulesByProperty');

describe('util/fonts/getCssRulesByProperty', function () {
    it('should throw when not passing an array of properties as first argument', function () {
        expect(getRules, 'to throw', 'properties argument must be an array');
    });

    it('should throw when not passing a cssSource as second argument', function () {
        expect(function () { getRules(['padding']); }, 'to throw', 'cssSource argument must be a string containing valid CSS');
    });

    it('should throw when not passing a valid CSS document in cssSource', function () {
        expect(function () { getRules(['padding'], 'sdkjlasjdlk'); }, 'to throw');
    });

    it('should return empty arrays when no properties apply', function () {
        expect(getRules(['padding'], 'h1 { color: red; }'), 'to exhaustively satisfy', {
            padding: []
        });
    });

    it('should return an array of matching property values', function () {
        expect(getRules(['color'], 'h1 { color: red; } h2 { color: blue; }'), 'to exhaustively satisfy', {
            color: [
                {
                    selector: 'h1',
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'red',
                    styleAttribute: false,
                    important: false
                },
                {
                    selector: 'h2',
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'blue',
                    styleAttribute: false,
                    important: false
                }
            ]
        });
    });

    it('should handle linine styles through `bogusselector`-selector', function () {
        expect(getRules(['color'], 'bogusselector { color: red; }'), 'to exhaustively satisfy', {
            color: [
                {
                    selector: undefined,
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'red',
                    styleAttribute: true,
                    important: false
                }
            ]
        });
    });

    it('should memoize the results of a call', function () {
        getRules.cache.reset();

        expect(getRules(['color'], 'h1 { color: red; }'), 'to exhaustively satisfy', {
            color: [
                {
                    selector: 'h1',
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'red',
                    styleAttribute: false,
                    important: false
                }
            ]
        });

        expect(getRules.cache.values(), 'to satisfy', [
            [
                null,
                {
                    color: [
                        {
                            selector: 'h1',
                            specificityArray: [0, 0, 0, 1],
                            prop: 'color',
                            value: 'red',
                            styleAttribute: false,
                            important: false
                        }
                    ]
                }
            ]
        ]);
    });
});
