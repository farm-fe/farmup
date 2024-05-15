import { Logger, UserConfig } from '@farmfe/core';
import { readFile, stat } from 'fs-extra';
import path from 'node:path';
import { CommonOptions, Format, ResolvedCommonOptions } from '../../types/options';
import { merge } from 'lodash-es';
import { isExists } from '../../util/file';

const findEntryKeyFromObject = (input: Record<string, string>) => {
    return Object.keys(input)[0];
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

        let file = value.join(':');

        if (!key) {
            throw new Error(`"${entry}" key is empty`);
        }
        if (!file) {
            throw new Error(`"${entry}" mapping file is empty`);
        }

        return [key, file];
    }

    const normalizedEntries: Record<string, string> = {};

    let map: Record<string, number> = {};
    let sameMap = new Set();
    for (const entry of entries ?? []) {
        const result = parseSingleEntry(entry);

        if (!result) continue;
        const [key, value] = Array.isArray(result) ? result : [undefined, result];

        if (sameMap.has(value)) {
            continue;
        } else {
            sameMap.add(value);
        }

        const find_uniq_key = (key?: string, suffix = '') => {
            if (!key) {
                key = 'index';
            }

            let newKey = key + suffix;
            if (map[newKey]) {
                map[newKey]++;
                return find_uniq_key(key, map[newKey].toString());
            } else {
                map[newKey] = 1;
                return newKey;
            }
        };

        let uniq_key = find_uniq_key(key);

        normalizedEntries[uniq_key] = value;
    }

    return Object.keys(normalizedEntries).length ? normalizedEntries : undefined;
}

export async function tryFindEntryFromUserConfig(logger: Logger, config: UserConfig, options: CommonOptions) {
    const entries_from_option = normalizeCommonEntry(options.entry);

    let findEntryKey = findEntryKeyFromObject(config.compilation?.input ?? {});
    let findEntry: string | null = null;

    if (!entries_from_option && !findEntryKey) {
        findEntry = await findDefaultExistsEntry();
        findEntryKey = 'index';
        if (!findEntry) {
            logger.error('entry is not found, please check your entry file', { exit: true });
            process.exit(1);
        } else {
            logger.info(`find and use this entry: "${findEntry}"`);
        }
        return {
            [findEntryKey]: findEntry,
        };
    } else {
        return merge(entries_from_option, config.compilation?.input ?? {});
    }
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
