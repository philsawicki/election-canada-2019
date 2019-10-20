module.exports = {
    transform: {
        "^.+\\.tsx?$": "ts-jest"
    },
    testMatch: [
        "**/__tests__/**/?(*.)+(spec|test).ts?(x)"
    ],
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
    coveragePathIgnorePatterns: [
        '__tests__/*'
    ]
};
