import type { UserConfig } from '@farmfe/core';

export type TargetEnv = Exclude<Required<Required<UserConfig>['compilation']>['output']['targetEnv'], undefined | null>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Get<T extends Record<keyof any, any>, K extends keyof any> = K extends `${infer PREFIX}.${infer LAST}`
    ? Get<Exclude<T[PREFIX], undefined>, LAST>
    : K extends keyof T
    ? T[K]
    : never;

export type Format = Get<UserConfig, 'compilation.output.format'>;

export interface CommonOptions {
    /** entry, if not found, it will be find from default file or directory */
    entry?: string[];

    /** transfer to execute file */
    args?: string[];

    /** help you debug your output */
    mode?: Get<UserConfig, 'compilation.mode'>;

    /** config path */
    config?: string;

    /** weather minify output file */
    minify?: boolean;

    /** in some platform, only support browser or node */
    format?: Format;

    /** polyfill */
    target?: TargetEnv;

    /**
     * use some command to run the output, if `undefined`, it will be default from `format`
     *
     * - node: `node`
     * - browser: `auto start server, and try open your browser`
     *
     * */
    execute?: string;

    /** external */
    external?: string[];

    /** auto external */
    autoExternal?: boolean;

    noWatch?: boolean;

    noExecute?: boolean;

    root?: string;

    /** watch files, support glob pattern */
    watchFiles?: string[];
    /** name for plugin or logger prefix */
    name?: string;
    /**
     * output directory for build
     * @default './dist'
     */
    outputDir?: string;
    /**
     * generate sourcemap
     * @params boolean | 'inline' | 'all' | 'all-inline'
     */
    sourcemap?: boolean | 'inline' | 'all' | 'all-inline'
}

export interface ResolvedCommonOptions {
    entry: Record<string, string>;
    args: string[];
    execute: ExecuteOption;
    external: [];
    minify?: boolean;
    mode: string;
    format?: CommonOptions['format'];
    target?: CommonOptions['target'];

    autoExternal: boolean;

    noExecute: boolean;

    watchFiles: string[];

    noWatch?: boolean;

    outputEntry?: {
        matchEntryName: (name: string, inputs: Record<string, string>) => string | undefined;
        name: string;
    };

    /**
     * @default './dist'
     */
    outputDir: string;
    /**
     * generate sourcemap
     * @params boolean | 'inline' | 'all' | 'all-inline'
     */
    sourcemap?: boolean  | 'inline' | 'all' | 'all-inline'
}

export enum ExecuteMode {
    Custom = 1,
    Node = 2,
    Browser = 3,
}

interface CustomExecuteOption {
    type: ExecuteMode.Custom;
    command: string;
    args: string[];
}

export interface NodeExecuteOption {
    type: ExecuteMode.Node;
    args: string[];
}

export interface BrowserExecuteOption {
    type: ExecuteMode.Browser;
    args: string[];
}

export type ExecuteOption = CustomExecuteOption | NodeExecuteOption | BrowserExecuteOption;
