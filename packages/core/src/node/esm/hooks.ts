import type { InitializeHook, ResolveHook, LoadHook } from 'node:module';
import path from 'node:path';
import type { InitializeHookContext, ResourceData } from './interface';
import { fileURLToPath } from 'node:url';

class Register {
    initialized = Promise.resolve();

    constructor(public resources: ResourceData) {}

    resource(url: string) {
        const absolutePath = path.join(this.resources.root, this.resources.outputDir);
        const relativePath = url.startsWith('file://') ? path.relative(absolutePath, fileURLToPath(url)) : url;

        return this.resources?.resources[relativePath];
    }

    entry() {
        return path.join(this.resources.root, this.resources.outputDir, this.resources.entry);
    }
}

let register!: Register;

const initialize: InitializeHook = function initialize({ number, port, resources }: InitializeHookContext) {
    register = new Register(resources);
    port.postMessage({ number: number + 1 });
};

const resolve: ResolveHook = async (specifier, context) => {
    const { parentURL = null } = context;

    return {
        shortCircuit: true,
        url: parentURL ? new URL(specifier, parentURL).href : new URL(specifier).href,
    };
};

const load: LoadHook = async (url, context, nextLoad) => {
    const data = register.resource(url);

    if (!data) {
        return nextLoad(url, context);
    }

    return {
        format: 'module',
        shortCircuit: true,
        source: Buffer.from(data),
    };
};

export { initialize, resolve, load };
