import type { Compiler } from '@farmfe/core';

export function defineProperty<O, K extends keyof O, V extends O[K]>(obj: O, key: K, value: V): V {
    const origin = obj[key];

    Object.defineProperty(obj, key, {
        value,
    });

    return origin as V;
}

export function proxyCompilerFn<
    T extends Compiler,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    OFT extends Record<keyof T, (...args: any) => any> = {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
    },
    K extends keyof OFT = keyof OFT,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    F extends (...args: any) => any = OFT[K],
>(compiler: T, fnName: K, callback: F) {
    const handler = ((...args: Parameters<OFT[K]>) => {
        const r = origin.bind(compiler)(...args);
        if (r instanceof Promise) {
            r.then((res) => callback({ args, result: res }));
        } else {
            callback({ args, result: r });
        }

        return r;
    }) as OFT[K];
    const origin = defineProperty<OFT, K, OFT[K]>(compiler as unknown as OFT, fnName, handler);
    return origin as OFT[K];
}
