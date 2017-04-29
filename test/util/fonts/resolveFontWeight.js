var expect = require('unexpected').clone();
var resolveFontWeight = require('../../../lib/util/fonts/resolveFontWeight');

describe('resolveFontWeight', function () {
    it('should return the input weight if it exists inthe available weights', function () {
        expect(resolveFontWeight(100, [100]), 'to be', 100);
        expect(resolveFontWeight(200, [200]), 'to be', 200);
        expect(resolveFontWeight(300, [300]), 'to be', 300);
        expect(resolveFontWeight(400, [400]), 'to be', 400);
        expect(resolveFontWeight(500, [500]), 'to be', 500);
        expect(resolveFontWeight(600, [600]), 'to be', 600);
        expect(resolveFontWeight(700, [700]), 'to be', 700);
        expect(resolveFontWeight(800, [800]), 'to be', 800);
        expect(resolveFontWeight(900, [900]), 'to be', 900);
    });

    describe('when desired weight is not available', function () {
        describe('and is less than 400', function () {
            it('should resolve to 300', function () {
                expect(resolveFontWeight(399, [100, 200, 300, 500]), 'to be', 300);
            });

            it('should resolve to 500', function () {
                expect(resolveFontWeight(399, [500, 600, 900]), 'to be', 500);
            });
        });

        describe('and is more than 500', function () {
            it('should resolve to 600', function () {
                expect(resolveFontWeight(501, [100, 200, 300, 600, 700, 800]), 'to be', 600);
            });

            it('should resolve to 400', function () {
                expect(resolveFontWeight(501, [100, 200, 300, 400]), 'to be', 400);
            });
        });

        describe('and equals 400', function () {
            it('should resolve to 500', function () {
                expect(resolveFontWeight(400, [300, 500]), 'to be', 500);
            });

            it('should resolve to 300', function () {
                expect(resolveFontWeight(400, [200, 300, 600]), 'to be', 300);
            });
        });

        describe('and equals 500', function () {
            it('should resolve to 400', function () {
                expect(resolveFontWeight(500, [400, 600]), 'to be', 400);
            });

            it('should resolve to 600', function () {
                expect(resolveFontWeight(500, [200, 300, 600]), 'to be', 600);
            });
        });
    });
});
