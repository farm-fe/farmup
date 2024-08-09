import { Logger, type JsPlugin } from '@farmfe/core';
import path from 'node:path';
import type { CommonOptions } from '../types/options';
import { NormalizeOption } from '../config/normalize';
import { CLI_NAME, logger as defaultLogger } from '../config/constant';
import { Executer } from '../core/executer';
import { ProxyCompiler } from '../core/proxyCompiler';

export { NormalizeOption, Executer };

export default function autoExecute(options: CommonOptions = {}, logger = defaultLogger): JsPlugin {
    const name = options.name ?? CLI_NAME;
    let outputDir: string | undefined = undefined;
    let executer: Executer | null = null;

    const normalizeOption = new NormalizeOption(options, logger);

    const proxyCompiler = new ProxyCompiler();

    proxyCompiler.onWriteResourcesToDisk(() => {
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

        const resourceOutputEntry = Object.keys(normalizeOption.options.entry)[0];

        if (!resourceOutputEntry) {
            logger.error('output entry is not found');
            return;
        }

        const executePath = path.join(outputDir, resourceOutputEntry);

        if (!executer) {
            executer = new Executer(normalizeOption.options.execute, logger, normalizeOption.options);
        }

        const nameWithoutExt = path.parse(resourceOutputEntry).name;

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

            if (!c.config.config?.watch) {
                return;
            }

            if (options.noWatch) {
                return;
            }

            const entries = Object.values(c.config.config?.input ?? {});

            if (entries.length === 0) {
                return;
            }

            for (const entry of entries) {
                c.addExtraWatchFile(entry, normalizeOption.options.watchFiles);
            }
        },
    };
}
