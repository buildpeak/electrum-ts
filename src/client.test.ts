import net from 'net';
import tls from 'tls';
import { ElectrumClient } from './client';
import { tlsMockSocketServer } from './transport/fixtures/mockServers.test';

describe('ElectrumClient', () => {
  let server: net.Server;
  let client: ElectrumClient;
  let address: net.AddressInfo;
  let tlsOptions: tls.TlsOptions;

  beforeAll((done) => {
    tlsMockSocketServer().then((result) => {
      [server, address, tlsOptions] = result;
      done();
    });
  });

  beforeEach(() => {
    client = new ElectrumClient(address.address, address.port, 'tls', {
      key: tlsOptions.key,
      cert: tlsOptions.cert,
      rejectUnauthorized: false,
    });
  });

  afterEach(() => {
    client.close();
  });

  afterAll((done) => {
    server.close(() => {
      done();
    });
  });

  // test('should created using TCPSocketClient', () => {
  //   expect(client).toBeInstanceOf(ElectrumClient);
  //   expect(TCPSocketClient).toHaveBeenCalledWith('localhost', 3000);
  // });
  //
  // test('should created using TLSSocketClient', () => {
  //   const clientTLS = new ElectrumClient('localhost', 3000, 'tls');
  //   expect(clientTLS).toBeInstanceOf(ElectrumClient);
  //   expect(TLSSocketClient).toHaveBeenCalledWith('localhost', 3000, {});
  //   clientTLS.close();
  // });
  //
  // test('should created using WebSocketClient', () => {
  //   const clientWS = new ElectrumClient('localhost', 3000, 'ws');
  //   expect(clientWS).toBeInstanceOf(ElectrumClient);
  //   expect(WebSocketClient).toHaveBeenCalledWith('ws://localhost:3000');
  //   clientWS.close();
  // });

  // ElectrumX RPC methods
  test('should call server.version', (done) => {
    client.server_version('electrum-ts', '1.4.2').then((res) => {
      expect(res).toEqual(['ElectrumX 1.16.0', '1.4.2']);

      done();
    });
  });
});
