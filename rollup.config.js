import typescriptPlugin from 'rollup-plugin-typescript';


export default {
    input: './src/main.ts',
    output: [
        {
            file: 'dist/bundle.esm.js',
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'dist/bundle.std.js',
            format: 'iife',
            name: 'canada',
            sourcemap: true
        }
    ],
    plugins: [
        typescriptPlugin({
            typescript: require('typescript')
        })
    ]
};
