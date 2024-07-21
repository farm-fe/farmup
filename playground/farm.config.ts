import { defineConfig } from '@farmfe/core';

export default defineConfig({
    compilation: {
        input: {
            index: 'index.ts',
        },
        persistentCache: false,
    },
});
