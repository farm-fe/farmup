import type { Compiler } from '@farmfe/core';

export type FnKeys<T> = {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    [K in keyof T]: T[K] extends (...arg: any[]) => any ? K : never;
}[keyof T];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type OmitFnReturn<T> = T extends (...args: infer Arg) => any ? (...args: Arg) => void : T;

export type CompilerFnKeys = FnKeys<Compiler>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface FnContext<Args extends any[], R> {
    args: Args;
    result: R;
}
