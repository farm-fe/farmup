import { Logger, type Resource, type JsPlugin } from '@farmfe/core';
import path from 'node:path';
import { type CommonOptions, ExecuteMode, type ResolvedCommonOptions } from '../types/options';
import { NormalizeOption } from '../config/normalize';
import { CLI_NAME, logger as defaultLogger } from '../config/constant';
import { Executer } from '../executer';

export { NormalizeOption, Executer };

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

export default function autoExecute(options: CommonOptions = {}, logger = defaultLogger): JsPlugin {
    let outputDir: string | undefined = undefined;
    let executer: Executer | null = null;

    const normalizeOption = new NormalizeOption(options, logger);

    return {
        name: `${CLI_NAME}:execute`,
        priority: Number.NEGATIVE_INFINITY,
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

        configureCompiler(compiler) {
            if (!compiler.config.config?.watch) {
                return;
            }

            if (options.noWatch) {
                return;
            }

            const entries = Object.values(compiler.config.config?.input ?? {});

            if (entries.length === 0) {
                return;
            }

            for (const entry of entries) {
                compiler.addExtraWatchFile(entry, normalizeOption.options.watchFiles);
            }
        },

        writeResources: {
            async executor(param) {
                if (normalizeOption.options.noExecute) {
                    return;
                }

                if (!outputDir) {
                    logger.error('output is not found');
                    return;
                }

                const resourceEntry = findOutputEntry(Object.values(param.resourcesMap), normalizeOption.options);

                if (!resourceEntry) {
                    logger.error('not found output entry');
                    return;
                }

                // TODO: multiple entry
                const executePath = path.join(outputDir, resourceEntry!.name);

                if (!executer) {
                    executer = new Executer(normalizeOption.options.execute, logger, normalizeOption.options);
                }

                const { name: nameWithoutExt } = path.parse(resourceEntry.name);
                const execLogger = new Logger({ name: `${CLI_NAME}:${nameWithoutExt}` });

                executer.execute(
                    executePath,
                    nameWithoutExt,
                    execLogger,
                );
            },
        },
    };
}
