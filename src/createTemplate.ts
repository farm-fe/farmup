import { WatcherOptions } from './plugin';

interface TemplateOptions {
    watcherOptions: WatcherOptions;
}

export function createStartTemplate(options: TemplateOptions) {
    return `
import { defineConfig } from '@farmfe/core';
import watcher from 'farmup/plugin';

export default defineConfig({
    compilation: {
        external: ['^@farmfe/core$'],
    },
    plugins: [watcher(${JSON.stringify(options.watcherOptions)})],
});
    `;
}
