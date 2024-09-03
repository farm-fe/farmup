import tmp from 'tmp';
import net from 'node:net';
import { Service } from './service';
import EventEmitter from 'node:events';
import path from 'node:path';

interface TempFileResult {
    path: string;
    cleanupCallback: () => void;
}

function createTempFile(): Promise<TempFileResult> {
    return new Promise((resolve) => {
        tmp.dir({}, (_err, name, cleanupCallback) => {
            resolve({
                path: path.join(name, `socket-${Date.now()}`),
                cleanupCallback,
            });
        });
    });
}

export class IpcServer<S, R> {
    private sockets = new Set<Service<S, R>>();
    private events = new EventEmitter();
    private _server!: net.Server;
    socket_path!: string;

    async start() {
        const tempFile = await createTempFile();
        this.socket_path = tempFile.path;

        const server = net.createServer((socket) => {
            const service = new Service<S, R>(socket);
            socket.on('close', () => {
                this.sockets.delete(service);
            });
            this.sockets.add(service);
            this.events.emit('connection', service);
        });

        server.listen(tempFile);

        this._server = server;
    }

    onConnection(callback: (socket: Service<S, R>) => void) {
        const handler = (socket: Service<S, R>) => {
            callback(socket);

            socket.onClose(() => {
                this.events.off('connection', handler);
            });
        };
        this.events.on('connection', handler);
    }

    close() {
        this._server.close();
        this.sockets.clear();
    }

    send(data: S) {
        for (const socket of this.sockets) {
            socket.send(data);
        }
    }
}
