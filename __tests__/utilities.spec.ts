import { hash, generateColorGradient } from '../src/utilities';


describe('utilities', () => {
    describe('#hash', () => {
        it('has a stable hash', () => {
            expect(hash('abc')).toEqual(5059922895146125);
        });
    });

    describe('#generateColorGradient', () => {
        it('generates a color gradient between a start end end color', () => {
            const gradientColors = generateColorGradient('#000000', '#ffffff', 4);

            expect(gradientColors).toEqual(['#000', '#3f3f3f', '#7f7f7f', '#bfbfbf', '#ffffff']);
        });
    });
});
