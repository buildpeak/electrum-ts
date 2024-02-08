import net, { type Socket, type SocketConstructorOpts } from 'net';
import { Logger } from '../types';

type Options = SocketConstructorOpts & {
  logger?: Logger;
};

export class TCPSocketClient {
  protected _socket: Socket;
  protected _state: string = 'disconnected';
  protected logger: Logger;
  private lineBuffer = '';

  public constructor(
    private readonly host: string,
    private readonly port: number,
    options?: Options,
  ) {
    const socketOps = {
      host: this.host,
      port: this.port,
      ...options,
    };

    this._state = 'connecting';
    this._socket = net.connect(socketOps, () => {
      this._state = 'connected';
    });

    this.logger = options?.logger || console;

    this._socket.setEncoding('utf8');
    this._socket.setKeepAlive(true, 0);
    this._socket.setNoDelay(true);

    if (this.constructor === TCPSocketClient) {
      this.listen();
    }
  }

  public get socket(): Socket {
    return this._socket;
  }

  public get state(): string {
    return this._state;
  }

  protected listen() {
    // on data
    this.socket.on('data', (data) => {
      this.lineBuffer += data;
      const lines = this.lineBuffer.split('\n');
      this.lineBuffer = lines.pop() || '';

      for (const line of lines) {
        this.socket.emit('message', line);
      }
    });

    // on error
    this.socket.on('error', (err) => {
      this.logger?.error('Socket error', err);
      this.socket.destroy();
    });

    // on close
    this.socket.on('close', () => {
      this._state = 'disconnected';
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: string, listener: (...args: any[]) => void) {
    this.socket.on(event, listener);
  }

  public send(data: string | Uint8Array) {
    this.socket.write(data);
  }

  public close() {
    this._socket.end();
  }
}
