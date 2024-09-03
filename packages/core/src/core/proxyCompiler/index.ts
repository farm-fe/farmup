import type { Compiler } from '@farmfe/core';
import EventEmitter from 'node:events';
import { proxyCompilerFn, defineProperty } from './util';
import type { FnContext, OmitFnReturn } from './interface';

export class ProxyCompiler {
    private compiler!: Compiler;

    private event: EventEmitter = new EventEmitter();

    private _preProxyFnList: (keyof Compiler)[] = [];
    private alreadyProxyFnList: Set<keyof Compiler> = new Set();
    isDisableEmit = false;

    start(compiler: Compiler) {
        const isRestart = !!this.compiler;
        this.compiler = compiler;

        if (this._preProxyFnList.length) {
            for (const fnName of this._preProxyFnList) {
                this.proxyCompiler(fnName);
            }

            this._preProxyFnList = [];
        }

        if (isRestart) {
            const proxyFnList = this.alreadyProxyFnList;
            this.alreadyProxyFnList = new Set();
            for (const fnName of proxyFnList) {
                this.proxyCompiler(fnName);
            }
        }
    }

    private proxyCompiler<K extends keyof Compiler>(fnName: K, force = false) {
        if (!this.compiler) {
            this._preProxyFnList.push(fnName);
            return;
        }

        if (!force && this.alreadyProxyFnList.has(fnName)) {
            return;
        }

        this.alreadyProxyFnList.add(fnName);

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        proxyCompilerFn(this.compiler, fnName, (...args: any[]) => this.event.emit(fnName, ...args));
    }

    private replaceCompiler<K extends keyof Compiler>(fnName: K, fn: Compiler[K]) {
        defineProperty(this.compiler, fnName, fn);
        // re proxy the compiler
        this.proxyCompiler(fnName, true);
    }

    private on<
        T extends Compiler,
        K extends keyof OFT,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        OFT extends Record<keyof T, (...args: any) => any> = {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            [KK in keyof T]: T[KK] extends (...args: any[]) => any ? T[KK] : never;
        },
    >(fnName: K, fn: (context: FnContext<Parameters<OFT[K]>, ReturnType<OFT[K]>>) => void) {
        this.proxyCompiler(fnName as keyof Compiler);
        this.event.on(fnName.toString(), fn);
        return () => {
            this.event.off(fnName.toString(), fn);
        };
    }

    onWriteResourcesToDisk(handler: OmitFnReturn<Compiler['writeResourcesToDisk']>) {
        return this.on('writeResourcesToDisk', (r) => handler(...r.args));
    }

    disableEmit() {
        if (this.isDisableEmit) return;
        const handler = () => Promise.resolve();
        this.replaceCompiler('writeResourcesToDisk', handler);
        this.isDisableEmit = true;
    }

    resources() {
        return this.compiler.resources();
    }
}
