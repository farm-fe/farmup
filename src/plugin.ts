import { JsPlugin, Logger, ResolvedUserConfig } from '@farmfe/core';
import path from 'path';
import { execa, ExecaChildProcess } from 'execa';
import { stat } from 'fs/promises';

// const resolve = (...paths: string[]) => path.join(process.cwd(), ...paths);

const name = 'farmup';

const logger = new Logger({
    name,
});

export type TargetEnv = Exclude<
    Required<Required<ResolvedUserConfig>['compilation']>['output']['targetEnv'],
    undefined | null
>;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface WatcherOptions {
    entry?: string;
    args?: string[];
    target?: TargetEnv;
    mode?: Required<Required<ResolvedUserConfig>['compilation']>['mode'];
}

const findEntryKeyFromObject = (input: Record<string, string>) => {
    return Object.keys(input)[0];
};

const isExists = async (filename: string) => {
    try {
        await stat(filename);
        return true;
    } catch {
        return false;
    }
};

const prefix = ['src'];
const maybeEntries = ['index.ts', 'index.js', 'main.ts', 'main.js', 'index.html', 'main.html', 'main.htm'];

async function findDefaultExistsEntry() {
    let entry = '';

    const prefixList = ['', ...prefix];

    for (const prefix of prefixList) {
        for (const item of maybeEntries) {
            const filename = path.join(prefix, item);
            if ((await isExists(filename)) && (await stat(filename)).isFile()) {
                entry = filename;
                break;
            }
        }
    }

    return entry;
}

const targetEnvExtensionsMap: Partial<Record<TargetEnv, string[]>> = {
    node: ['.ts', '.js'],
    browser: ['.html', '.htm'],
};

function targetEnvFromEntry(entry: string): TargetEnv {
    const result = Object.entries(targetEnvExtensionsMap).find(([_, exts]) => {
        exts.includes(path.extname(entry));
    }) as [TargetEnv, unknown];

    if (result) {
        return result[0];
    }

    return 'node';
}

export default function watcher(options: WatcherOptions = {}): JsPlugin {
    let entry: string;
    let outputDir: string | undefined = undefined;
    let child: ExecaChildProcess | null = null;

    process.on('beforeExit', () => {
        if (child) {
            child.kill();
        }
    });

    console.log(options);

    return {
        name: 'watcher',
        priority: 100000,
        async config(config) {
            let findEntryKey = findEntryKeyFromObject(config.compilation?.input ?? {});
            let findEntry: string | null = null;

            if (!findEntryKey && options.entry) {
                findEntryKey = 'index';
                findEntry = options.entry;
                logger.info(`use entry from command line: "${options.entry}"`);
            } else {
                if (!findEntryKey || !config.compilation?.input?.[findEntryKey]) {
                    findEntry = await findDefaultExistsEntry();
                    findEntryKey = 'index';
                    if (!findEntry) {
                        logger.error('entry is not found, please check your entry file', { exit: true });
                        process.exit(1);
                    } else {
                        logger.info(`find and use this entry: "${findEntry}"`);
                    }
                } else {
                    findEntry = config.compilation?.input?.[findEntryKey]!;
                }
            }

            entry = findEntryKey;

            const targetEnv = options.target || targetEnvFromEntry(findEntry!);

            return {
                compilation: {
                    input: {
                        [findEntryKey]: findEntry!,
                    },
                    output: {
                        targetEnv,
                    },
                },
            };
        },
        configResolved(config) {
            outputDir = config.compilation?.output?.path;
        },

        writeResources: {
            async executor(param) {
                if (!entry) {
                    logger.error('entry is not found');
                    return;
                }

                if (!outputDir) {
                    logger.error('output is not found');
                    return;
                }

                const resourceEntry = Object.values(param.resourcesMap).find((item) => item.info?.data.isEntry);
                const execute_path = path.join(outputDir, resourceEntry?.name || entry);

                if (child) {
                    while (!child.kill()) {
                        await delay(300);
                    }
                    child = null;
                }

                child = execa('node', [execute_path, ...(Array.isArray(options.args) ? options.args : [])], {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                });

                logger.info(`execute_path: ${execute_path}, pid: ${child.pid}`);

                child.on('exit', (code) => {
                    if (child) {
                        if (code === 0) {
                            logger.info(`${child.pid} done`);
                        } else {
                            logger.info(`${child.pid} killed`);
                        }
                        child = null;
                    }
                });
            },
        },
    };
}
