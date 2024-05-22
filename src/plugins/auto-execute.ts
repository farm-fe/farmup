import { Logger, type Resource, type JsPlugin } from '@farmfe/core';
import path from 'node:path';
import { type CommonOptions, ExecuteMode, type ResolvedCommonOptions } from '../types/options';
import { NormalizeOption } from '../config/normalize';
import { autoExternal } from './auto-external';
import { CLI_NAME, logger } from '../config/constant';
import { Executer } from '../executer';

export { CLI_NAME, logger, autoExternal, NormalizeOption, Executer };

function findOutputEntry(resource: Resource[], options: ResolvedCommonOptions) {
    const resourceEntry = resource.find((item) => item.info?.data.isEntry);

    if (resourceEntry) {
        return resourceEntry;
    }

    switch (options.execute.type) {
        case ExecuteMode.Browser:
            return resource.find((item) => item.name.endsWith('.html') || item.name.endsWith('.hml'));
        case ExecuteMode.Node:
            return resource.find((item) => {
                return Object.keys(options.entry).find((entry) => new RegExp(`${entry}\\..+$`).test(item.name));
            });
    }
}

export default function autoExecute(options: CommonOptions = {}): JsPlugin {
    let outputDir: string | undefined = undefined;
    let executer: Executer | null = null;

    const normalize_option = new NormalizeOption(options, logger);

    return {
        name: `${CLI_NAME}:watcher`,
        priority: Number.NEGATIVE_INFINITY,
        async config(config) {
            const normalizedOption = await normalize_option.config(config);
            return normalizedOption;
        },
        configResolved(config) {
            outputDir = config.compilation?.output?.path;
        },

        configureCompiler(compiler) {
            if (!compiler.config.config?.watch) {
                return;
            }
            const entries = Object.values(compiler.config.config?.input ?? {});

            if (entries.length === 0) {
                return;
            }

            for (const entry of entries) {
                compiler.addExtraWatchFile(entry, normalize_option.options.watchFiles);
            }
        },
        finish: {
            async executor() {
                console.log('执行完了啊');
            },
        },
        writeResources: {
            async executor(param) {
                if (normalize_option.options.noExecute) {
                    return;
                }

                if (!outputDir) {
                    logger.error('output is not found');
                    return;
                }

                const resourceEntry = findOutputEntry(Object.values(param.resourcesMap), normalize_option.options);

                if (!resourceEntry) {
                    logger.error('not found output entry');
                    return;
                }

                // TODO: multiple entry
                const execute_path = path.join(outputDir, resourceEntry!.name);

                if (!executer) {
                    executer = new Executer(normalize_option.options.execute, logger, normalize_option.options);
                }

                executer.execute(
                    execute_path,
                    resourceEntry.name,
                    new Logger({
                        name: `${CLI_NAME}:${resourceEntry.name}`,
                    })
                );
            },
        },
    };
}
