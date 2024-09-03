import type { Socket } from 'node:net';

export class Service<S, R> {
    // private status = ServiceStatus.WaitShakeHand;

    constructor(private _socket: Socket) {}

    send(data: S) {
        if (this._socket.closed) {
            return;
        }
        this._socket.write(JSON.stringify(data));
    }

    onMessage(callback: (data: R) => void) {
        const handler = (data: Buffer) => {
            callback(JSON.parse(data.toString()));
        };

        this._socket.on('data', handler);

        return () => {
            this._socket.off('data', handler);
        };
    }

    close() {
        this._socket.end();
    }

    onClose(callback: () => void) {
        this._socket.on('close', callback);
    }

    get isClose() {
        return this._socket.closed;
    }
}
