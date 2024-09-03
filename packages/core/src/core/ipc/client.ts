import EventEmitter from 'node:events';
import net from 'node:net';

export class IpcClient<S, R> {
    private client!: net.Socket;

    events = new EventEmitter();

    start(socketPath: string) {
        const client = net.createConnection(socketPath);

        client.on('data', (data) => {
            this.events.emit('data', data);
        });

        this.client = client;
    }

    send(data: S) {
        this.client.write(JSON.stringify(data));
    }

    onMessage(callback: (data: R) => void) {
        this.events.on('data', (data) => {
            callback(JSON.parse(data.toString()));
        });
    }
}
