import type { Logger, UserConfig } from '@farmfe/core';
import {
    type CommonOptions,
    ExecuteMode,
    type NodeExecuteOption,
    type ResolvedCommonOptions,
    type TargetEnv,
} from '../../types/options';
import { pinOutputEntryFilename, tryFindEntryFromUserConfig, tryFindFormatFromPackage } from './find-entry';
import { isObject, isUndefined, merge, pick } from 'lodash-es';
import path from 'node:path';
import { isExists } from '../../util/file';
import { glob } from 'glob';

function normalizedMinify(config: UserConfig, commonOptions: CommonOptions, options: ResolvedCommonOptions) {
    if (!isUndefined(commonOptions.minify)) {
        const minify = config.compilation?.minify;
        if (typeof minify === 'boolean' || (isObject(minify) && minify !== null)) {
            options.minify = commonOptions.minify;
        }
    }
}

const extensionMapExecutedMode: Record<string, ExecuteMode> = {
    mjs: ExecuteMode.Node,
    js: ExecuteMode.Node,
    ts: ExecuteMode.Node,
    html: ExecuteMode.Browser,
    htm: ExecuteMode.Browser,
};

function normalizedExecuted(commonOption: CommonOptions, options: ResolvedCommonOptions) {
    if (commonOption.execute) {
        options.execute = {
            type: ExecuteMode.Custom,
            command: commonOption.execute,
            args: commonOption.args ?? [],
        };
        return;
    }

    const target = commonOption.target;

    if (target) {
        if (target.includes('browser')) {
            options.execute = {
                type: ExecuteMode.Browser,
                args: commonOption.args ?? [],
            };
        } else if (target.includes('node')) {
            options.execute = {
                type: ExecuteMode.Node,
                args: commonOption.args ?? [],
            };
        }
    } else {
        // from entry file ext
        const entryFiles = Object.values(options.entry);
        let res: ExecuteMode | undefined;
        for (const item of entryFiles) {
            const targetFromExt = extensionMapExecutedMode[path.extname(item).slice(1)];

            if (!isUndefined(targetFromExt)) {
                res = targetFromExt;
                break;
            }
        }

        if (isUndefined(res)) {
            res = ExecuteMode.Node;
        }
        options.execute = {
            type: res,
            args: commonOption.args ?? [],
        } as NodeExecuteOption;
    }
}

async function normalizedFormat(config: UserConfig, commonOptions: CommonOptions, options: ResolvedCommonOptions) {
    if (commonOptions.format) {
        options.format = commonOptions.format;
    } else if (config.compilation?.output?.format) {
        options.format = config.compilation.output.format;
    } else {
        const formatFromPackage = await tryFindFormatFromPackage(commonOptions.root ?? process.cwd());
        if (formatFromPackage) {
            options.format = formatFromPackage;
        } else {
            options.format = 'cjs';
        }
    }
}

const invalidTargetEnv = [
    'browser',
    'node',
    'node16',
    'node-legacy',
    'node-next',
    'browser-legacy',
    'browser-es2015',
    'browser-es2017',
    'browser-esnext',
];

const extMapTargetEnv: Record<string, TargetEnv> = {
    mjs: 'node',
    js: 'node',
    ts: 'node',
    html: 'browser',
    htm: 'browser',
};

export function normalizedTargetEnv(
    config: UserConfig,
    commonOptions: CommonOptions,
    options: ResolvedCommonOptions,
    logger: Logger,
) {
    config.compilation?.output?.targetEnv;
    if (commonOptions.target) {
        if (!invalidTargetEnv.includes(commonOptions.target)) {
            logger.error(`target ${commonOptions.target}  is invalid`);
        }
        options.target = commonOptions.target;
    } else if (config.compilation?.output?.targetEnv) {
        options.target = config.compilation.output.targetEnv;
    } else {
        let targetFromInput: TargetEnv | undefined;

        for (const entryFile of Object.values(options.entry)) {
            const ext = path.extname(entryFile).slice(1);
            if (extMapTargetEnv[ext]) {
                targetFromInput = extMapTargetEnv[ext];
                break;
            }
        }

        if (targetFromInput) {
            options.target = targetFromInput;
        }
    }
}

async function normalizeWatchFiles(commonOptions: CommonOptions) {
    const watchFiles = commonOptions.watchFiles ?? [];
    const result = [];

    for (const file of watchFiles) {
        if (await isExists(file)) {
            result.push(file);
            continue;
        }

        const matchFiles = await glob(file);

        result.push(...matchFiles);
    }

    return result;
}

async function normalizedSimpleConfig(
    config: UserConfig,
    commonOptions: CommonOptions,
    options: ResolvedCommonOptions,
    logger: Logger,
) {
    const inputs = await tryFindEntryFromUserConfig(logger, config, commonOptions);

    options.entry = inputs;

    config.compilation ??= {};
    normalizedMinify(config, commonOptions, options);
    await normalizedFormat(config, commonOptions, options);
    normalizedTargetEnv(config, commonOptions, options, logger);

    merge(options, {
        ...(commonOptions.mode || config.compilation?.mode
            ? { mode: commonOptions.mode || config.compilation?.mode }
            : {}),
        ...(commonOptions.format || config.compilation?.output?.format
            ? { format: commonOptions.format || config.compilation?.output?.format }
            : {}),
        ...(commonOptions.target || config.compilation?.output?.targetEnv
            ? { target: commonOptions.target || config.compilation?.output?.targetEnv }
            : {}),
        ...(commonOptions.autoExternal ? { autoExternal: !!commonOptions.autoExternal } : {}),
        noExecute: commonOptions.noExecute ?? false,
        noWatch: commonOptions.noWatch ?? true,
        watchFiles: await normalizeWatchFiles(commonOptions),
    } as Partial<ResolvedCommonOptions>);

    normalizedExecuted(commonOptions, options);

    pinOutputEntryFilename(options);
}

function withServerOrWatch(userConfig: UserConfig, resolvedOption: ResolvedCommonOptions): UserConfig {
    switch (resolvedOption.execute.type) {
        case ExecuteMode.Custom: {
            merge(userConfig, { compilation: { watch: !resolvedOption.noWatch }, server: undefined } as UserConfig);
            break;
        }

        case ExecuteMode.Browser: {
            if (!userConfig.server) {
                merge(userConfig, { server: { port: 12306, cors: true } } as UserConfig);
            }
            break;
        }

        case ExecuteMode.Node: {
            if (!userConfig.server) {
                merge(userConfig, { compilation: { watch: !resolvedOption.noWatch }, server: undefined } as UserConfig);
            }
            break;
        }
    }

    return userConfig;
}

export class NormalizeOption {
    options: ResolvedCommonOptions = {
        entry: {},
        args: [],
        execute: { type: ExecuteMode.Node, args: [] },
        external: [],
        mode: 'development',
        autoExternal: false,
        noExecute: false,
        watchFiles: [],
    };

    constructor(
        private commonOption: CommonOptions,
        private logger: Logger,
    ) {}

    async config(config: UserConfig): Promise<UserConfig> {
        await normalizedSimpleConfig(config, this.commonOption, this.options, this.logger);
        return withServerOrWatch(
            {
                compilation: {
                    input: this.options.entry,
                    output: {
                        ...pick(this.options, ['format', 'mode']),
                        ...(this.options.target ? { targetEnv: this.options.target } : {}),
                        ...(this.options.outputEntry ? { entryFilename: this.options.outputEntry.name } : {}),
                    },
                    ...pick(this.options, 'minify'),
                },
            },
            this.options,
        );
    }

    async normalizeByCommonOption() {
        await normalizedSimpleConfig({}, this.commonOption, this.options, this.logger);
    }

    static async fromCommonOption(commonOption: CommonOptions, logger: Logger) {
        const option = new NormalizeOption(commonOption, logger);

        await option.normalizeByCommonOption();

        return option;
    }

    merge(options: ResolvedCommonOptions) {
        this.options = {
            ...this.options,
            ...options,
        };
    }
}
