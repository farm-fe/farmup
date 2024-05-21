#!/usr/bin/env node

process.removeAllListeners('warning');

const defaultEmit = process.emit;
process.emit = function (...args) {
    if (args[1].name === 'ExperimentalWarning') {
        return undefined;
    }
    return defaultEmit.call(this, ...args);
};

import '../dist/index.js';
