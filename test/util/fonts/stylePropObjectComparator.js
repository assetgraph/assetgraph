var expect = require('unexpected');
var comparator = require('../../../lib/util/fonts/stylePropObjectComparator');

describe('utils/fonts/stylePropObjectComparator', function () {
    it('should sort important objects before non-important objects', function () {
        var a = {
            important: true
        };
        var b = {
            important: false
        };

        var compare = comparator([a, b]);

        expect(compare(a, b), 'to be', -1);
    });

    it('should sort inlineStyle objects before non-inlineStyle', function () {
        var a = {
            important: false,
            inlineStyle: true
        };
        var b = {
            important: false,
            inlineStyle: false
        };

        var compare = comparator([a, b]);

        expect(compare(a, b), 'to be', -1);
    });


    it('should sort higher specificity objects before lower specificity objects', function () {
        var a = {
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 1, 0]
        };
        var b = {
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };

        var compare = comparator([a, b]);

        expect(compare(a, b), 'to be', -1);
    });

    it('should maintain source order when all else is equal', function () {
        var a = {
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };
        var b = {
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };

        var compare = comparator([a, b]);

        expect(compare(a, b), 'to be', -1);
    });

    it('should sort a big array of different cases correctly', function () {
        var a = {
            id: 'a',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };
        var b = {
            id: 'b',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };
        var c = {
            id: 'c',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 1, 0, 1]
        };
        var d = {
            id: 'd',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 1, 1]
        };
        var e = {
            id: 'e',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 1, 0, 1]
        };
        var f = {
            id: 'f',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 1, 0]
        };
        var g = {
            id: 'g',
            important: true,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };
        var h = {
            id: 'h',
            important: false,
            inlineStyle: false,
            specificityArray: [0, 0, 0, 1]
        };
        var i = {
            id: 'i',
            important: false,
            inlineStyle: true,
            specificityArray: [0, 0, 0, 1]
        };
        var j = {
            id: 'j',
            important: true,
            inlineStyle: true,
            specificityArray: [0, 0, 0, 1]
        };
        var k = {
            id: 'k',
            important: false,
            inlineStyle: false,
            specificityArray: [1, 0, 0, 1]
        };

        var array = [a, b, c, d, e, f, g, h, i, j, k];

        expect(array.sort(comparator(array)), 'to satisfy', [
            j, g, i, k, c, e, d, f, a, b, h
        ]);
    });
});
