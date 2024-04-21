import { logger, watch, build as farmBuild, UserConfig } from '@farmfe/core';
import { writeFile, mkdir, stat } from 'fs/promises';
import tmp from 'tmp';
import path from 'path';
import cac from 'cac';
import { readFileSync } from 'fs';
import { exists } from 'fs-extra';
import { createStartTemplate } from './createTemplate';
import { WatcherOptions } from './plugin';
import { pick } from 'lodash-es';

const resolveRoot = (p: string) => path.resolve(process.cwd(), p);

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)).toString());

interface ExecuteOption extends WatcherOptions {}

async function createTempConfig() {
    const tmpdir = resolveRoot('./node_modules/.farmup/config');

    if (!(await exists(tmpdir)) || (await stat(tmpdir)).isDirectory()) {
        await mkdir(tmpdir, { recursive: true });
    }

    return tmp.fileSync({
        postfix: '.ts',
        tmpdir: tmpdir,
    });
}

async function start(options: ExecuteOption) {
    const tmpConfigFilePath = await createTempConfig();
    let template = createStartTemplate({
        watcherOptions: {
            ...pick(options, ['entry', 'args', 'target'] satisfies (keyof WatcherOptions)[]),
        },
    });

    await writeFile(tmpConfigFilePath.name, template, 'utf-8');

    watch({ configPath: tmpConfigFilePath.name }).then(() => {
        logger.info('watch start...');
        tmpConfigFilePath.removeCallback();
    });
}

async function build(options: ExecuteOption) {
    const tmpConfigFilePath = await createTempConfig();
    let template = createStartTemplate({
        watcherOptions: {
            ...pick(options, ['entry', 'args', 'target'] satisfies (keyof WatcherOptions)[]),
        },
    });

    await writeFile(tmpConfigFilePath.name, template, 'utf-8');

    farmBuild({ configPath: tmpConfigFilePath.name }).then(() => {
        tmpConfigFilePath.removeCallback();
    });
}

const cli = cac('farmup');

cli.option(
    '--target [target]',
    `target for output, default is node, support 'browser' | 'node' | 'node16' | 'node-legacy' | 'node-next' | 'browser-legacy' | 'browser-es2015' | 'browser-es2017' | 'browser-esnext'`
).option('--mode [mode]', 'mode for build, default is development, support development | production');

function commonOptionsFromArgs(args: Record<string, any>): Partial<ExecuteOption> {
    return {
        target: args['target'],
        args: args['--'],
        mode: args['mode'],
    };
}

cli.command('[entry]', 'start watch').action((entry, options) => {
    build({
        entry,
        ...commonOptionsFromArgs(options),
    });
});

cli.command('start [entry]', 'start watch').action((entry, options) => {
    start({
        entry,
        ...commonOptionsFromArgs(options),
    });
});

cli.help();

cli.version(version);

cli.parse();
