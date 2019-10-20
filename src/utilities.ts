/**
 * "cyrb53" hashing function.
 *
 * @param string Text to hash.
 * @param seed Hashing seed.
 * @returns The hash value of the given text.
 */
export function hash(string: string, seed: number = 0) {
    let hash1 = 0xdeadbeef ^ seed;
    let hash2 = 0x41c6ce57 ^ seed;

    for (let i = 0, ch; i < string.length; ++i) {
        ch = string.charCodeAt(i);
        hash1 = Math.imul(hash1 ^ ch, 2654435761);
        hash2 = Math.imul(hash2 ^ ch, 1597334677);
    }

    hash1 = Math.imul(hash1 ^ hash1 >>> 16, 2246822507) ^ Math.imul(hash2 ^ hash2 >>> 13, 3266489909);
    hash2 = Math.imul(hash2 ^ hash2 >>> 16, 2246822507) ^ Math.imul(hash1 ^ hash1 >>> 13, 3266489909);

    return 4294967296 * (2097151 & hash2) + (hash1 >>> 0);
}

/**
 * Generate gradient step colors.
 *
 * @param from Gradient start color (in hex format).
 * @param to Gradient end color (in hex format).
 * @param nbSteps Number of gradient steps to generate.
 */
export function generateColorGradient(from: string, to: string, nbSteps: number) {
    const parsedFrom = from.replace('#', '');
    const splitFrom = [
        parseInt(parsedFrom.substr(0, 2), 16),
        parseInt(parsedFrom.substr(2, 2), 16),
        parseInt(parsedFrom.substr(4, 2), 16)
    ];

    const parsedTo = to.replace('#', '');
    const splitTo = [
        parseInt(parsedTo.substr(0, 2), 16),
        parseInt(parsedTo.substr(2, 2), 16),
        parseInt(parsedTo.substr(4, 2), 16)
    ];

    const colorRanges = [
        splitTo[0] - splitFrom[0],
        splitTo[1] - splitFrom[1],
        splitTo[2] - splitFrom[2]
    ];

    const gradientColors: string[] = [];
    for (let i = 0; i <= nbSteps; ++i) {
        const colorStep = [
            Math.floor(splitFrom[0] + colorRanges[0] * i / nbSteps).toString(16),
            Math.floor(splitFrom[1] + colorRanges[1] * i / nbSteps).toString(16),
            Math.floor(splitFrom[2] + colorRanges[2] * i / nbSteps).toString(16)
        ];
        gradientColors.push(`#${ colorStep.join('') }`);
    }
    return gradientColors;
}
