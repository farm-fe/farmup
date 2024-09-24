import { defineConfig } from '@farmfe/core';

export default defineConfig({
    compilation: {
        presetEnv: false,
        input: {
            vm: './src/node/cjs/vm.ts',
        },
        output: {
            targetEnv: 'node',
            format: 'cjs',
            entryFilename: '[entryName].cjs',
            clean: false,
        },
        lazyCompilation: false,
        persistentCache: false,
        external: ['^@farmfe/core$'],
        minify: false,
        treeShaking: true,
    },
});
