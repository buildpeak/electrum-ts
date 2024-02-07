import tls from 'tls';
import { TCPSocketClient } from './tcp';

export class TLSSocketClient extends TCPSocketClient {
  private tlsSocket: tls.TLSSocket;

  public constructor(
    host: string,
    port: number,
    tlsOptions: tls.TLSSocketOptions,
  ) {
    super(host, port);

    this.tlsSocket = new tls.TLSSocket(super.socket, tlsOptions);

    this.listen();
  }

  public get socket(): tls.TLSSocket {
    return this.tlsSocket;
  }

  public close() {
    this.tlsSocket.end();
    super.close();
  }
}
