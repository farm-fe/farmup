import { defineConfig } from '@farmfe/core';
import dts from '@farmfe/js-plugin-dts';

export default defineConfig({
    compilation: {
        presetEnv: false,
        input: {
            index: 'src/index.ts',
            plugin: 'src/plugin.ts',
        },
        output: {
            targetEnv: 'node',
        },
        persistentCache: false,
        external: ['^@farmfe/core$'],
        minify: false,
    },
    plugins: [dts()],
});
