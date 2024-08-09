import type { Logger, UserConfig } from '@farmfe/core';
import { readFile, stat } from 'fs-extra';
import path from 'node:path';
import { ExecuteMode, type CommonOptions, type Format, type ResolvedCommonOptions } from '../../types/options';
import { isExists } from '../../util/file';

const findEntryKeyFromObject = (input: Record<string, string | undefined | null>) => {
    let entry = null;
    for (const key in input) {
        if (input[key]) {
            entry = key;
            break;
        }
    }
    return entry;
};

const maybeEntryPrefix = ['src'];
const maybeEntries = ['index.ts', 'main.ts', 'index.js', 'main.js', 'index.html', 'main.html', 'main.htm'];

async function findDefaultExistsEntry() {
    let entry = '';

    const prefixList = ['', ...maybeEntryPrefix];

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

/**
 * index:src/index.ts
 *
 * @param entries
 * @returns
 */
function normalizeCommonEntry(entries: CommonOptions['entry']): ResolvedCommonOptions['entry'] | undefined {
    function parseSingleEntry(entry: string) {
        if (!entry) return;

        const result = entry.split(':');

        if (result.length === 1) {
            return result[0];
        }

        const [key, ...value] = result;

        const file = value.join(':');

        if (!key) {
            throw new Error(`"${entry}" key is empty`);
        }
        if (!file) {
            throw new Error(`"${entry}" mapping file is empty`);
        }

        return [key, file];
    }

    const normalizedEntries: Record<string, string> = {};

    const map: Record<string, number> = {};
    const sameMap = new Set();
    for (const entry of entries ?? []) {
        const result = parseSingleEntry(entry);

        if (!result) continue;
        const [key, value] = Array.isArray(result) ? result : [undefined, result];

        if (sameMap.has(value)) {
            continue;
        }

        sameMap.add(value);

        const find_uniq_key = (key?: string, suffix = '') => {
            const newKey = (key ?? 'index') + suffix;
            if (map[newKey]) {
                map[newKey]++;
                return find_uniq_key(key, map[newKey].toString());
            }

            map[newKey] = 1;
            return newKey;
        };

        const uniq_key = find_uniq_key(key);

        normalizedEntries[uniq_key] = value;
    }

    return Object.keys(normalizedEntries).length ? normalizedEntries : undefined;
}

export async function tryFindEntryFromUserConfig(logger: Logger, config: UserConfig, options: CommonOptions) {
    const entriesFromOption = normalizeCommonEntry(options.entry);

    const defaultCompilationInputKeys = Object.keys(config.compilation?.input ?? {}).reduce(
        (res, key) => Object.assign(res, { [key]: null }),
        {} as Record<string, null | undefined | string>,
    );

    const clearDefault = (obj: Record<string, null | string | undefined>) => ({
        ...defaultCompilationInputKeys,
        ...obj,
    });

    // cli option > config
    if (entriesFromOption) {
        return clearDefault(entriesFromOption);
    }

    let findEntryKey = findEntryKeyFromObject(config.compilation?.input ?? {});

    if (findEntryKey) return clearDefault({ [findEntryKey]: config.compilation?.input?.[findEntryKey] });

    let findEntry: string | null = null;

    findEntry = await findDefaultExistsEntry();
    findEntryKey = 'index';
    if (!findEntry) {
        logger.error('entry is not found, please check your entry file correct', { exit: true });
        process.exit(1);
    } else {
        logger.info(`automatic find and use this entry: "${findEntry}"`);
    }
    return clearDefault({ [findEntryKey]: findEntry });
}

const packageModuleValueMapFormat: Record<string, Format> = {
    module: 'esm',
    commonjs: 'cjs',
};

export async function tryFindFormatFromPackage(root: string): Promise<Format | undefined> {
    const packageFilename = path.join(root, 'package.json');

    if (await isExists(packageFilename)) {
        try {
            const content: { type: 'commonjs' | 'module' } = JSON.parse(await readFile(packageFilename, 'utf-8'));
            return packageModuleValueMapFormat[content.type];
        } catch (error) {
            return undefined;
        }
    }

    return undefined;
}

const formatMapExt: Record<Exclude<Format, undefined>, string> = {
    cjs: 'js',
    esm: 'mjs',
};

export function pinOutputEntryFilename(options: ResolvedCommonOptions) {
    if (options.noExecute) return;

    const executeMode = options.execute.type;

    if (options.target?.startsWith('browser')) {
        return;
    }

    if (executeMode === ExecuteMode.Node && !options.noExecute) {
        options.entry = Object.entries(options.entry).reduce(
            (res, [key, val]) => {
                if (val) res[`${key}.${formatMapExt[options.format ?? 'cjs']}`] = val;
                return res;
            },
            {} as Record<string, string>,
        );

        options.outputEntry = {
            name: '[entryName]',
        };
    }
}
