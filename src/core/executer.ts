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
    ) {}

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

        child.stdout?.on('data', (data) => logger.debug(trimEndLF(data.toString())));

        child.stderr?.on('data', (err) => logger.error(err));

        this.child = child;

        process.on('beforeExit', this.closeChild);
        process.on('exit', this.closeChild);

        child.on('exit', (code) => {
            code && this.logger.info(`"${name}" PID ${child.pid} ${code === 0 ? 'done' : `exit ${code}`}`);
            this.child = undefined;
        });
    }

    async closeChild() {
        while (this.child && !this.child.killed) {
            this.child.kill();
            await delay(50);
        }
        this.child = undefined;
    }
}
