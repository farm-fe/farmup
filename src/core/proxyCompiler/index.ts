import type { Compiler } from '@farmfe/core';
import EventEmitter from 'node:events';
import { proxyCompilerFn } from './util';
import type { FnContext, OmitFnReturn } from './interface';

export class ProxyCompiler {
    private compiler!: Compiler;

    private event: EventEmitter = new EventEmitter();

    private lastResources: string[] = [];
    private _preProxyFnList: (keyof Compiler)[] = [];
    private alreadyProxyFnList: Set<keyof Compiler> = new Set();

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

        this.on('resources', (r) => {
            this.lastResources = Object.keys(r.result);
        });
    }

    get resource_names() {
        return this.lastResources;
    }

    private proxyCompiler<K extends keyof Compiler>(fnName: K) {
        if (!this.compiler) {
            this._preProxyFnList.push(fnName);
            return;
        }

        if (this.alreadyProxyFnList.has(fnName)) {
            return;
        }

        this.alreadyProxyFnList.add(fnName);

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        proxyCompilerFn(this.compiler, fnName, (...args: any[]) => this.event.emit(fnName, ...args));
    }

    private on<
        T extends Compiler,
        K extends keyof OFT,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        OFT extends Record<keyof T, (...args: any) => any> = {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            [KK in keyof T]: T[KK] extends (...args: any[]) => any ? T[KK] : never;
        }
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
}
