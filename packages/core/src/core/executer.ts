import { type ExecaChildProcess, execaCommand } from 'execa';
import { ExecuteMode, type ExecuteOption, type ResolvedCommonOptions } from '../types/options';
import type { Logger } from '@farmfe/core';
import { delay } from '../util/async';
import { trimEndLF } from '../util/log';

export class Executer {
    child?: ExecaChildProcess;

    constructor(
        public option: ExecuteOption,
        public logger: Logger,
        public normalizedOption: ResolvedCommonOptions,
    ) { }

    execute(path: string, name: string, logger = this.logger) {
        switch (this.option.type) {
            case ExecuteMode.Browser: {
                // console.log('TODO: use open command');
                break;
            }
            case ExecuteMode.Node: {
                this._execute('node', name, [path, ...this.option.args], logger);
                break;
            }
            case ExecuteMode.Custom: {
                this._execute(this.option.command, name, [path, ...this.option.args], logger);
                break;
            }
        }
    }

    async _execute(command: string, name: string, args: string[], logger: Logger) {

        if (this.child) {
            await this.closeChild();
        }

        const child = execaCommand([command, ...args].join(' '), {
            cwd: process.cwd(),
            stdio: 'pipe',
        });

        const onStdoutData = (data: Buffer) => logger.debug(trimEndLF(data.toString()));
        const onStderrData = (err: Error) => logger.error(err);

        child.stdout?.on('data', onStdoutData);
        child.stderr?.on('data', onStderrData);

        this.child = child;


        const onBeforeExit = () => this.closeChild();
        process.on('beforeExit', onBeforeExit);
        process.on('exit', onBeforeExit);

        child.on('exit', (code) => {
            this.logger.info(`"${name}" PID ${child.pid} ${!code ? 'done' : `exit ${code}`}`);
            this.child = undefined;

            child.stdout?.off('data', onStdoutData);
            child.stderr?.off('data', onStderrData);
            process.off('beforeExit', onBeforeExit);
            process.off('exit', onBeforeExit);
        });
    }

    async closeChild() {
        const maxRetries = 10;
        let retries = 0;

        while (this.child && !this.child.killed && retries < maxRetries) {
            this.child.kill();
            await delay(50);
            retries++;
        }

        if (this.child && !this.child.killed) {
            this.logger.warn(`Child process PID ${this.child.pid} failed to close after ${maxRetries} attempts`);
        }

        await new Promise<void>((resolve) => {
            this.child.on('exit', () => {
                console.log('exit');

                resolve();
            });
        });

        this.child = undefined;
    }
}
