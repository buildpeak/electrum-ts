import WebSocket from 'ws';

export class WebSocketClient {
  private _socket: WebSocket;
  private _state: string = 'disconnected';
  protected logger: Console | undefined;

  public constructor(url: string, options: WebSocket.ClientOptions = {}) {
    this._socket = new WebSocket(url, options);

    // on open
    this._socket.on('open', () => {
      console.log('WebSocket opened');
      this._state = 'connected';
    });

    // on error
    this.socket.on('error', (err: Error) => {
      this.logger?.error('Socket error', err);
      this.socket.close();
    });

    // on close
    this.socket.on('close', () => {
      this._state = 'disconnected';
    });
  }

  public get socket(): WebSocket {
    return this._socket;
  }

  public get state(): string {
    return this._state;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: string, listener: (...args: any[]) => void) {
    switch (event) {
      case 'connect':
        this._socket.on('open', listener);
        break;
      case 'message':
        this._socket.on('message', (msg) => listener(msg.toString('utf8')));
        break;
      default:
        this._socket.on(event, listener);
    }
  }

  public send(data: string | Uint8Array) {
    this._socket.send(data);
  }

  public close() {
    this._socket.close(0, 'Normal closure');
  }
}
