import { defineConfig } from '@farmfe/core';

export default defineConfig({
    compilation: {
        presetEnv: false,
        input: {
            index: 'src/index.ts',
            plugin: 'src/plugin-entry.ts',
            import_register: './src/node/esm/register.ts',
            import_hooks: './src/node/esm/hooks.ts',
        },
        output: {
            targetEnv: 'node',
            format: 'esm',
        },
        script: {
            nativeTopLevelAwait: true,
            plugins: [],
        },
        lazyCompilation: false,
        persistentCache: false,
        external: ['^@farmfe/core$'],
        minify: false,
        treeShaking: true,
    },
});
