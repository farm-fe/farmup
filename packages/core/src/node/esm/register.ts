import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { MessageChannel } from 'node:worker_threads';
import { IpcClient } from '../../core/ipc/client';
import type { ResourceData } from './interface';

const { port1: _, port2 } = new MessageChannel();

const ipc = new IpcClient<unknown, ResourceData>();

const FARM_ESM_RESOURCE_MOCK_PORT = process.env.FARM_ESM_RESOURCE_MOCK_PORT;

ipc.start(FARM_ESM_RESOURCE_MOCK_PORT!);

let lastMessage!: ResourceData;

async function run() {
    await new Promise((resolve) => {
        ipc.onMessage((data) => {
            lastMessage = data;
            resolve(undefined);
        });
    });
}

await run();

register('./import_hooks.js', {
    parentURL: pathToFileURL(import.meta.filename),
    data: { number: 1, port: port2, resources: lastMessage },
    transferList: [port2],
});
