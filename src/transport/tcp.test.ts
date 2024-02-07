import net from 'net';
import { tcpMockSocketServer } from './fixtures/mockServers.test';
import { TCPSocketClient } from './tcp';

describe('TCPSocketClient', () => {
  let server: net.Server;
  let client: TCPSocketClient;
  let address: net.AddressInfo;

  beforeAll((done) => {
    tcpMockSocketServer().then((result) => {
      [server, address] = result;
      done();
    });
  });

  beforeEach(() => {
    client = new TCPSocketClient(address.address, address.port);
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
    expect(client).toBeInstanceOf(TCPSocketClient);
  });

  test('should connect to the server', (done) => {
    client.socket.on('connect', () => {
      expect(client.socket.connecting).toBeFalsy();
      expect(client.state).toEqual('connected');
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

  test('should send and receive message', (done) => {
    client.send('Hello');

    client.socket.on('data', (data) => {
      expect(data.toString()).toEqual('Hello');
      done();
    });
  });
});
