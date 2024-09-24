import vm, { SyntheticModule } from 'node:vm';
import m from 'node:module';
import path from 'node:path';
import type { ResourceData } from '../esm/interface';
import type Module from 'node:module';
import { IpcClient } from '../../core/ipc/client';

const ipc = new IpcClient<unknown, ResourceData>();

const FARM_ESM_RESOURCE_MOCK_PORT = process.env.FARM_ESM_RESOURCE_MOCK_PORT;
let resourcesData: ResourceData;

ipc.onMessage((data) => {
    resourcesData = data;

    for (const key in resourcesData.resources) {
        if (path.isAbsolute(key)) continue;
        const v = resourcesData.resources[key];
        delete resourcesData.resources[key];
        const filename = path.join(process.cwd(), resourcesData.outputDir, key);
        if (key === resourcesData.entry) {
            resourcesData.entry = filename;
        }
        resourcesData.resources[filename] = v;
    }

    start();

    ipc.close();
});

ipc.start(FARM_ESM_RESOURCE_MOCK_PORT!);

function createVmContextByModule(newM: Module) {
    return vm.createContext(
        {
            __farm__filename: newM.filename,
            __farm__dirname: path.dirname(newM.filename),
            __farm_m: newM,
        },
        {},
    );
}

function tryExt(filename: string, obj: Record<string, unknown>) {
    for (const ext of ['', '.js', '.cjs']) {
        if (obj[filename + ext]) return filename + ext;
    }
}

const nativeRequire = require;

const createRequire = (importerModule: Module | undefined) => {
    function tryRequireModule(id: string): { module: Module } | undefined {
        const filename = getSourceByImport(id, importerModule?.filename);

        const tryExtFromCacheFilename = tryExt(filename, nativeRequire.cache);

        if (tryExtFromCacheFilename) {
            return { module: nativeRequire.cache[tryExtFromCacheFilename]! };
        }

        const tryExtFromResourceFilename = tryExt(filename, resourcesData.resources);

        if (tryExtFromResourceFilename) {
            const importer = importerModule?.filename;

            const { module: m } = runModuleByFilename(tryExtFromResourceFilename, importer);

            return { module: m };
        }
    }
    const __require = function require(id: string) {
        const v = tryRequireModule(id);
        if (v) {
            return v.module.exports;
        }
        return nativeRequire(id);
    } as NodeRequire;

    for (const key of ['cache', 'resolve', 'extensions'] as (keyof NodeRequire)[]) {
        // @ts-ignore
        __require[key] = nativeRequire[key];
    }

    return { __require, tryRequireModule };
};

function createContext(_ctx: vm.Context, require: NodeRequire) {
    return new Proxy(_ctx, {
        get(target, prop) {
            if (prop in target) {
                // @ts-ignore
                return target[prop];
            }
            if (prop === 'require') {
                return require;
            }
            if (globalThis && prop in globalThis) {
                // @ts-ignore
                return globalThis[prop];
            }
        },
    });
}

function executeCode(code: string, ctx: ModuleContext) {
    vm.runInNewContext(
        `
        (function(exports, require, module, __filename, __dirname) {
        ${code}
})(__farm_m.exports, require, __farm_m, __farm__filename, __farm__dirname);`.trim(),
        ctx.context,
        {
            // @ts-ignore
            async importModuleDynamically(specifier, script, importAttributes) {
                let exports: Record<string, unknown> | undefined;
                if (
                    m.builtinModules.includes(specifier) ||
                    (specifier.startsWith('node:') && m.builtinModules.includes(specifier.slice(5)))
                ) {
                    exports = require(specifier);
                }
                const filename = getSourceByImport(specifier, ctx.filename);
                if (resourcesData.resources[filename]) {
                    const res = runModuleByFilename(filename, ctx.filename);
                    exports = res.module.exports;
                }

                if (exports) {
                    const m = new SyntheticModule(Object.keys(exports), () => {});

                    // @ts-ignore
                    await m.link(() => {});

                    for (const key of Object.keys(exports)) {
                        const val = exports[key];
                        m.setExport(key, val);
                    }

                    await m.evaluate();

                    return m;
                }
            },
        },
    );
}

function nativeModuleCache(m: Module, r: NodeRequire, importer?: string) {
    if (importer) {
        r.cache[importer]?.children.push(m);
    }
}

function createModule(source: string, importer?: string) {
    const filename = getSourceByImport(source, importer);

    const newM = new m.Module(filename, tryGetModuleByFilename(importer));
    newM.filename = filename;

    return newM;
}

function getSourceByImport(filename: string, importer?: string) {
    return path.isAbsolute(filename)
        ? filename
        : importer
          ? path.join(path.dirname(importer), filename)
          : path.join(process.cwd(), resourcesData.outputDir, filename);
}

function tryGetModuleByFilename(filename?: string): Module | undefined {
    if (filename && nativeRequire.cache[filename]) {
        return nativeRequire.cache[filename];
    }
}

interface ModuleContext {
    filename: string;
    module: Module;
    require: NodeRequire;
    context: vm.Context;
    tryRequireModule: (id: string) => { module: Module } | undefined;
}

function runModuleByFilename(_filename: string, importer?: string): ModuleContext {
    const filename = getSourceByImport(_filename, importer);

    const m = createModule(filename, importer);

    const r = createRequire(tryGetModuleByFilename(importer));

    const ctx = createContext(createVmContextByModule(m), r.__require);

    const tryExtFilenameFromResource = tryExt(filename, resourcesData.resources);

    if (!tryExtFilenameFromResource) {
        throw new Error(`cannot found module: ${_filename} in ${importer}`);
    }

    const moduleContext = {
        filename: tryExtFilenameFromResource,
        module: m,
        require: r.__require,
        context: ctx,
        tryRequireModule: r.tryRequireModule,
    };
    const code = resourcesData.resources[tryExtFilenameFromResource];

    r.__require.cache[tryExtFilenameFromResource] = m;

    executeCode(code, moduleContext);

    m.loaded = true;

    nativeModuleCache(m, r.__require, importer);

    return moduleContext;
}

function start() {
    runModuleByFilename(resourcesData.entry);
}
