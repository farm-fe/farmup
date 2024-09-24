import EventEmitter from 'node:events';
import net from 'node:net';

export class IpcClient<S, R> {
    private client!: net.Socket;

    events = new EventEmitter();

    start(socketPath: string) {
        const client = net.createConnection(socketPath);

        let data = Buffer.alloc(0);

        client.on('end', () => {
            this.events.emit('data', data.toString('utf-8'));
            data = Buffer.alloc(0);
        });

        client.on('data', (buffer) => {
            data = Buffer.concat([new Uint8Array(data), new Uint8Array(buffer)], data.byteLength + buffer.byteLength);
        });

        this.client = client;
    }

    async send(data: S) {
        return new Promise<void>((resolve) => {
            this.client.end(JSON.stringify(data), () => {
                resolve();
            });
        });
    }

    onMessage(callback: (data: R) => void) {
        this.events.on('data', (data) => {
            callback(JSON.parse(data.toString()));
        });
    }

    close() {
        this.client.end();
    }
}
