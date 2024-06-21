import {
    watch as farmWatch,
    start as farmStart,
    build as farmBuild,
    type JsPlugin,
    getConfigFilePath,
    type FarmCLIOptions,
    type UserConfig,
    version as FarmCoreVersion,
    NoopLogger,
} from '@farmfe/core';
import cac from 'cac';
import { readFileSync } from 'node:fs';
import autoExecute, { NormalizeOption } from './plugins/auto-execute';
import { ExecuteMode, type CommonOptions } from './types/options';
import autoExternal from './plugins/auto-external';
import path from 'node:path';
import { isBoolean, isString } from 'lodash-es';
import { logger } from './config/constant';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)).toString());

function buildPluginsByCommonOption(options: CommonOptions): JsPlugin[] {
    const plugins = [];

    plugins.push(autoExecute(options));

    if (options.autoExternal) {
        plugins.push(autoExternal());
    }

    return plugins;
}

type InlineConfig = FarmCLIOptions & UserConfig;

function createInlineConfig(options: CommonOptions): InlineConfig {
    return {
        root: options.root,
        configPath: options.config,
        plugins: buildPluginsByCommonOption(options),
        logger: logger,
    };
}

async function autoStart(options: CommonOptions) {
    const preNormalizeOption = await NormalizeOption.fromCommonOption(options, new NoopLogger());
    const inlineConfig = createInlineConfig(options);
    // console.log(preNormalizeOption.options);
    switch (preNormalizeOption.options.execute.type) {
        case ExecuteMode.Browser:
            return farmStart(inlineConfig);
        case ExecuteMode.Node:
        case ExecuteMode.Custom:
            return options.noWatch ? farmBuild(inlineConfig) : farmWatch(inlineConfig);
    }
}

async function start(options: CommonOptions) {
    const inlineConfig = createInlineConfig(options);
    await farmStart(inlineConfig);
}

async function watch(options: CommonOptions) {
    const inlineConfig = createInlineConfig(options);
    await farmWatch(inlineConfig);
}

async function build(options: CommonOptions) {
    if (options.noExecute && !options.noWatch) {
        await watch(options);
        return;
    }

    const inlineConfig = createInlineConfig(options);
    await farmBuild(inlineConfig);
}

const cli = cac('farmup');

cli.option('-w, --watch [...files]', 'watch files', { default: false })
    .option('-e, --exec [file]', 'custom execute command')
    .option('-o, --output [dir]', 'output directory, default "./dist" if not set in config')
    .option('--mode [mode]', 'mode for build, default is development, choose one from "development" or "production"')
    .option('--minify', 'minify for output')
    .option('-c, --config [config]', 'config path, if not path, it will be auto find')
    .option('--no-config', 'if farm.config.[ext] exists, it will be ignore')
    .option('--format [format]', 'choose one from "cjs" or "esm"')
    .option('--external [...external]', 'external')
    .option('--no-auto-external', 'if not found module, auto as external', { default: true })
    .option('--sourcemap [sourcemap]', 'generate sourcemap or not')
    .option(
        '--target [target]',
        "target for output, default is node, support 'browser'、'node'、'node16'、'node-legacy'、'node-next'、'browser-legacy'、'browser-es2015'、'browser-es2017'、'browser-esnext'",
    );

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function commonOptionsFromArgs(args: Record<string, any>): Promise<Partial<CommonOptions>> {
    const root = process.cwd();
    const configPath =
        typeof args.config === 'string'
            ? path.isAbsolute(args.config)
                ? args.config
                : path.resolve(root, args.config)
            : args.config
              ? await getConfigFilePath(root)
              : undefined;
    const execute = isString(args.exec) && !isBoolean(args.exec) ? args.exec : undefined;

    return {
        root,
        target: args.target,
        args: args['--'],
        mode: args.mode,
        autoExternal: args.autoExternal,
        execute,
        format: args.format,
        config: configPath,
        minify: args.minify,
        noWatch: args.watch === false,
        noExecute: args.exec === false,
        external: Array.isArray(args.external) ? args.external : [args.external].filter(Boolean),
        watchFiles: [args.watch]
            .flat()
            .map((item) => (item === true ? undefined : item))
            .filter(Boolean),
        outputDir: args.output || './dist',
        sourcemap: args.sourcemap === 'false' ? false : args.sourcemap === 'true' ? true : args.sourcemap,
    };
}

cli.command('[entry]', 'start ts/js/html file').action(async (entry, options) => {
    autoStart({
        entry: Array.isArray(entry) ? entry : [entry].filter(Boolean),
        ...(await commonOptionsFromArgs(options)),
    });
});

cli.command('build [entry]', 'start watch for node or custom command')
    .option('--no-exec', 'disable execute')
    .action(async (entry, options) => {
        build({
            entry: Array.isArray(entry) ? entry : [entry].filter(Boolean),
            ...(await commonOptionsFromArgs(options)),
        });
    });
cli.command('start [entry]', 'start server for html file').action(async (entry, options) => {
    start({
        entry: Array.isArray(entry) ? entry : [entry].filter(Boolean),
        ...(await commonOptionsFromArgs(options)),
    });
});

cli.showHelpOnExit = true;

cli.showVersionOnExit = true;

cli.version(`${version} (core: ${FarmCoreVersion})`);

cli.parse();
