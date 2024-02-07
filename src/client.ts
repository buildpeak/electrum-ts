import EventEmitter from 'events';
import { JSONRPC, JSONRPCResponse } from './json-rpc';
import { TCPSocketClient } from './transport/tcp';
import { TLSSocketClient } from './transport/tls';
import { WebSocketClient } from './transport/ws';
import { ServerVersionOutput, Txn } from './types';

export class ElectrumClient {
  public readonly socket: TCPSocketClient | TLSSocketClient | WebSocketClient;
  private msgId = 1;
  private logger = console;
  private subscribe: EventEmitter;
  private listeners: Map<string, (res: JSONRPCResponse) => void> = new Map();

  public clientName = 'electrum-ts';
  public protocolVersion = '1.4.2';

  public constructor(
    host: string,
    port: number,
    protocol: string,
    options: Record<string, unknown> = {},
  ) {
    switch (protocol) {
      case 'tcp':
        this.socket = new TCPSocketClient(host, port, options);
        break;
      case 'ssl':
      case 'tls':
        this.socket = new TLSSocketClient(host, port, options);
        break;
      case 'ws':
        this.socket = new WebSocketClient(`ws://${host}:${port}`, options);
        break;
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }

    this.subscribe = new EventEmitter();

    this.socket.on('message', (data) => {
      this.logger.debug('Received message: %j', data);

      const msg = JSON.parse(data);
      if (msg instanceof Array) {
        // check if it's a JSON-RPC batch response
        return;
      } else if (msg.id === undefined || msg.id === null) {
        // it's a notification
        this.subscribe.emit(msg.method, msg.params);
      } else {
        // it's a response
        this.handleResponse(msg);
      }
    });

    this.socket.on('error', (err) => {
      this.logger.error('Socket error', err);
      this.socket.close();
    });

    this.socket.on('connect', () => {
      this.logger.debug('Socket connected');
    });
  }

  public connect() {
    // this.socket.connect();
  }

  public waitForConnection() {
    return new Promise((resolve) => {
      if (this.socket.state === 'connected') {
        resolve(true);
      } else {
        this.socket.on('connect', resolve);
      }
    });
  }

  private nextMsgId(): number | string {
    return this.msgId++;
  }

  private handleResponse(response: JSONRPCResponse) {
    const listener = this.listeners.get(response.id.toString());

    if (listener) {
      listener(response);
      this.listeners.delete(response.id.toString());
    }
  }

  private async listenForResponse<T>(id: number | string): Promise<T> {
    this.logger.debug('Listening for response: %s', id);

    return new Promise((resolve, reject) => {
      this.listeners.set(id.toString(), (response) => {
        if ('result' in response) {
          resolve(<T>response.result);
        } else {
          reject(response.error);
        }
      });
    });
  }

  public async request<T>(method: string, params: unknown[]): Promise<T> {
    await this.waitForConnection();

    const msgId = this.nextMsgId();

    const req = JSONRPC.makeRequest(method, params, msgId);

    this.logger.debug('Sending request: %j', req);

    // send request
    this.socket.send(JSON.stringify(req) + '\n');

    // wait for response
    return await this.listenForResponse<T>(req.id);
  }

  public close() {
    this.logger.debug('Closing client', this.socket.constructor.name);
    this.socket.close();
  }

  // ElectrumX API
  public server_version(clientName: string, protocolVersion: string) {
    return this.request<ServerVersionOutput>('server.version', [
      clientName,
      protocolVersion,
    ]);
  }

  public blockchain_transaction_get<T extends boolean>(
    txHash: string,
    verbose: T = false as T,
  ): Promise<Txn<T>> {
    return this.request<Txn<T>>('blockchain.transaction.get', [
      txHash,
      verbose,
    ]);
  }
}
