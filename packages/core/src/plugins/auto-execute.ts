import { Logger, type JsPlugin } from '@farmfe/core';
import path from 'node:path';
import { ExecuteMode, type CommonOptions } from '../types/options';
import { NormalizeOption } from '../config/normalize';
import { CLI_NAME, logger as defaultLogger } from '../config/constant';
import { Executer } from '../core/executer';
import { ProxyCompiler } from '../core/proxyCompiler';
import { IpcServer } from '../core/ipc/server';
import type { ResourceData } from '../node/esm/interface';
import { fileURLToPath } from 'node:url';

export { NormalizeOption, Executer };

export default function autoExecute(options: CommonOptions = {}, logger = defaultLogger): JsPlugin {
    const name = options.name ?? CLI_NAME;
    let outputDir: string | undefined = undefined;
    let executer: Executer | null = null;

    const normalizeOption = new NormalizeOption(options, logger);

    const proxyCompiler = new ProxyCompiler();
    let ipcServer: IpcServer<ResourceData, unknown> | null = null;

    proxyCompiler.onWriteResourcesToDisk(async () => {
        if (normalizeOption.options.noExecute) {
            return;
        }

        if (!outputDir) {
            logger.error('outputDir is not found');
            return;
        }

        if (!normalizeOption.options.outputEntry) {
            return;
        }

        const resourceOutputEntry = Object.entries(normalizeOption.options.entry).filter((item) => item[1])[0]?.[0];

        if (!resourceOutputEntry) {
            logger.error('output entry is not found');
            return;
        }

        const executePath = path.join(outputDir, resourceOutputEntry);

        if (!executer) {
            executer = new Executer(normalizeOption.options.execute, logger, normalizeOption.options);
        }

        const nameWithoutExt = path.parse(resourceOutputEntry).base;

        if (normalizeOption.options.execute.type === ExecuteMode.Node && options.experienceScript) {
            if (!ipcServer) {
                ipcServer = new IpcServer<ResourceData, unknown>();
                await ipcServer.start();
            }

            if (ipcServer) {
                ipcServer.onConnection(async (service) => {
                    service.onClose(() => {
                        ipcServer?.close();
                        ipcServer = null;
                    });

                    await service.send({
                        entry: resourceOutputEntry,
                        name: '',
                        outputDir: outputDir ?? './dist',
                        resources: Object.entries(proxyCompiler.resources() ?? {}).reduce(
                            (result, [key, value]) => {
                                result[key] = value.toString('utf-8');
                                return result;
                            },
                            {} as Record<string, string>,
                        ),
                        root: options.root!,
                    });
                });
            }

            const getExecutePath = (): string => {
                if (normalizeOption.options.format === 'cjs') {
                    return path.join(fileURLToPath(path.dirname(import.meta.url)), './vm.cjs');
                }

                // mock path, after replace as entry
                return path.join(options.root!, options.outputDir ?? './dist', resourceOutputEntry);
            };

            executer.execute(
                getExecutePath(),
                nameWithoutExt,
                new Logger({
                    name: `${name}:${nameWithoutExt}`,
                }),
                {
                    env: {
                        FARM_ESM_RESOURCE_MOCK_PORT: ipcServer?.socket_path,
                    },
                },
            );

            return;
        }

        executer.execute(
            executePath,
            nameWithoutExt,
            new Logger({
                name: `${name}:${nameWithoutExt}`,
            }),
        );
    });

    return {
        name: `${name}:execute`,
        priority: Number.MIN_SAFE_INTEGER,
        async config(config) {
            return await normalizeOption.config(config);
        },

        configResolved(config) {
            outputDir = config.compilation?.output?.path;
            const format = config.compilation?.output?.format || normalizeOption.options.format;
            const targetEnv = config.compilation?.output?.targetEnv || normalizeOption.options.target;
            const entry = Object.values(config.compilation?.input || normalizeOption.options.entry)[0];
            logger.debug(`[entry: ${entry}] [format: ${format}] [target: ${targetEnv}]`);
        },

        configureCompiler(c) {
            proxyCompiler.start(c);

            if (
                !normalizeOption.options.noExecute &&
                normalizeOption.options.execute.type === ExecuteMode.Node &&
                options.experienceScript
            ) {
                proxyCompiler.disableEmit();
            }

            if (!c.config.config?.watch) {
                return;
            }

            if (options.noWatch) {
                return;
            }

            const entries = Object.values(c.config.config?.input ?? {}).filter(Boolean);

            if (entries.length === 0) {
                return;
            }

            for (const entry of entries) {
                c.addExtraWatchFile(entry!, normalizeOption.options.watchFiles);
            }
        },
    };
}
