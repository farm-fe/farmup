import { defineConfig } from '@farmfe/core';

export default defineConfig({
    compilation: {
        presetEnv: false,
        input: {
            index: 'src/index.ts',
            plugin: 'src/plugin-entry.ts',
        },
        output: {
            targetEnv: 'node',
            format: 'esm'
        },
        persistentCache: false,
        external: ['^@farmfe/core$'],
        minify: false,
    },
});
