import net from 'net';
import tls from 'tls';
import { tlsMockSocketServer } from './fixtures/mockServers.test';
import { TLSSocketClient } from './tls';

describe('TLSSocketClient', () => {
  let server: tls.Server;
  let client: TLSSocketClient;
  let address: net.AddressInfo;
  let tlsOptions: tls.TlsOptions;

  beforeAll((done) => {
    tlsMockSocketServer().then((result) => {
      [server, address, tlsOptions] = result;
      done();
    });
  });

  beforeEach(() => {
    client = new TLSSocketClient(address.address, address.port, {
      key: tlsOptions.key,
      cert: tlsOptions.cert,
      rejectUnauthorized: false,
    });

    client.on('error', (error) => {
      console.error('Client error: ', error);
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

  test('should create a new instance', () => {
    expect(client).toBeInstanceOf(TLSSocketClient);
  });

  test('should connect to the server', (done) => {
    client.socket.on('connect', () => {
      expect(client.socket.connecting).toBeFalsy();
      expect(client.state).toEqual('connected');
      done();
    });
  });

  test('should send and receive message', (done) => {
    client.send('Hello');

    client.on('data', (data) => {
      expect(data.toString()).toEqual('Hello');
      done();
    });
  });

  test('should emit message event', (done) => {
    client.send('message.test');

    const results = ['Hello one', 'Hello two', 'Hello three'];

    let count = 0;
    client.on('message', (data) => {
      expect(data.toString()).toEqual(results[count++]);
      if (count === results.length) {
        done();
      }
    });
  });
});
