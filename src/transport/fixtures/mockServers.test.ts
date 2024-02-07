import net from 'net';
import tls from 'tls';

export const electrumMockData: { [key: string]: unknown } = {
  'server.version': ['ElectrumX 1.16.0', '1.4.2'],
};

export const testData: { [key: string]: string } = {
  Hello: 'Hello',
  'message.test': 'Hello one\nHello two\nHello three\n',
};

const messageHandler = (socket: net.Socket, data: string): void => {
  if (data in testData) {
    socket.write(testData[data]);
    return;
  }

  try {
    const json = JSON.parse(data);
    if (json.method in electrumMockData) {
      const res = {
        jsonrpc: '2.0',
        method: json.method,
        result: electrumMockData[json.method],
        id: json.id,
      };
      socket.write(JSON.stringify(res) + '\n');
      return;
    }
  } catch (err) {
    console.error(err);
  }

  // Echo the data back to the client
  socket.write(data);
};

export const tcpMockSocketServer = (): Promise<
  [net.Server, net.AddressInfo]
> => {
  const server = net.createServer();

  server.on('connection', (socket) => {
    socket.on('data', (data) => {
      console.log('servier received:', data.toString());

      messageHandler(socket, data.toString());
    });
  });

  server.on('close', () => {
    console.log('server closed');
  });

  return new Promise((resolve) => {
    server.listen(() => {
      const address = server.address() as net.AddressInfo;
      console.log(`server started on port ${address.port}`);

      return resolve([server, address]);
    });
  });
};

export const tlsMockSocketServer = (): Promise<
  [tls.Server, net.AddressInfo, typeof tlsOptions]
> => {
  const server = tls.createServer(tlsOptions, (socket) => {
    console.log(
      'server connected',
      socket.authorized ? 'authorized' : 'unauthorized',
    );
    socket.setEncoding('utf8');

    socket.on('data', (data: string) => {
      console.log('servier received:', data.toString());

      messageHandler(socket, data);
    });
  });

  server.on('error', (error) => {
    console.error('server error: ', error);
  });

  return new Promise((resolve) => {
    server.listen(() => {
      const address = server.address() as net.AddressInfo;
      console.log(`server started on port ${address.port}`);

      return resolve([server, address, tlsOptions]);
    });
  });
};

const tlsOptions = {
  key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCoHwYWmduCwPxE
w5aPNkEk3GckthIEa2U7QV0sUYLRswSW9RsAkw40PmLJfuxGpMWXt2Em0eYXzzdb
/3DXaxbFlQblIOhsRL8aQUSBQvpK3ipIXXIPKLDW/+4dXNTDYJKvzaynzY/gUa+V
o1N+JtkRA5X5nciJzmKfi4oketCIfc8VeqH1R8jCThlCMq7c9WD3EDHcfdXs/Pcm
4VZnTlWRfxAWTCuDWtcCtjRLSlN0C2CKDriOzFzBU8P8tfHpvwoQAmk8S1/6NDFk
WGZMNcigg+PfGUFUT/z/N7AGqbkIbcJQreFODsdQuLqzfxZuPLvQnJs0b2srz8Fj
D31vmoeJAgMBAAECggEAAbr0ApaJylI3JnQG4Cl0SS9VhmyzScVbMN1u2o5qNMNN
aEpUgVCCJGqB9MXwI5f9ip6yCsa9QgB5duJtpGHvRZBPllsc2URp3RjP3i60ycF4
mO8RRfOqwkO3DSlP7UTYraOFw+JbOTlN/9HDAbjfogux5vRHRJfRrweuH8r9y3HP
vnYGf8rAsHWQg+7ezGCYLq5or5+1ivNdEbmbfIylB4QzpOTBVQ24dwZvQSzqqI/b
+z+z66B+bmavRh99Mb/C5u8mrDRWqRUAcXAVCmNZuKruxGFo5uPozOqFpJw3zc36
+SfT8PbFqfgKNUtlyVHzJGDQXCHmL8k72w10M4X/iwKBgQDjduSWHX3MgeZ3gmyW
YHrCquaHhDTmncid7n+qdQ9sE0g/C+Aew1tFtSC3hYDcniGB8rNUpSQQTzjKm9nX
nMLzkiIRX1ftg35QBNuqmPi3HJT6ayyPlGSzeQWxGtjKhOsw1YQIJLTweXhZxYN5
Y5V2CecVlJeQAvT8daXGbP8/cwKBgQC9NkzPYCNfzO2ehiCHN9KmKceaxXFK6GJ0
g3an5s9MHMY4zw/s8PBhAhfxcIPhrzGWDtegIm5liQYIcXWyN14kRU39ZcViXQep
aeo9Inw4aU6Uskq2keBl3b8pkbphshXqDVyrgYNZsNctwSgtwO7UjHdgcyYcLjLE
0ZbIqttmEwKBgQC4aM9xlH9EqZu7EBYQ5C8iW4OCIoDw5sKap50BCN5z9D4CPxJ4
XlFE9k+L+cQ7GEh6HdWdrjTKtC+Ks0etMf4rkjHke7PBb3WcUhP0/wfFDHsLepAp
51is2FTw/J79sT0r3i6om3nF6/TScvrgEwg9JlIegNVPf9Y2RvsbH4rgWQKBgFpR
9VB4n+o3NKabeCOT7iYLg5DJ906+p2De8GEtuH6oraaokP2V9ekYyr0h7JJqwszS
wPNb/D7TreGR55DvBS1jN9tiHVra9bFVMc+FCq8S9cPdZ/TGpct6kqoROlswW22i
ez4TUNQbqlvY/Ij6tAcaFlIgJW0GUI3LTqLzjE+pAoGACKMku5EJKew1jD7qqFbI
Zv/d92qORKkIzOhzVv3GyUBiFd8KPPAv/K9XZ7W3+0amxxjWJnaqOMhknsJ2omYI
r8TWFlFDOBbnYwlelCqg0T/43DrkVnE+cJSmnkNyJeMjR4MYysMvvShnAl5atpg9
ImlYHaNeVg/BKs76UvnpyJM=
-----END PRIVATE KEY-----`,
  cert: `-----BEGIN CERTIFICATE-----
MIIDOTCCAiGgAwIBAgIUMsqqJTBzLklz1XJ8EtFRy0SqAXYwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNDAyMDYxMjA3NDFaFw0yNDAz
MDcxMjA3NDFaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCoHwYWmduCwPxEw5aPNkEk3GckthIEa2U7QV0sUYLR
swSW9RsAkw40PmLJfuxGpMWXt2Em0eYXzzdb/3DXaxbFlQblIOhsRL8aQUSBQvpK
3ipIXXIPKLDW/+4dXNTDYJKvzaynzY/gUa+Vo1N+JtkRA5X5nciJzmKfi4oketCI
fc8VeqH1R8jCThlCMq7c9WD3EDHcfdXs/Pcm4VZnTlWRfxAWTCuDWtcCtjRLSlN0
C2CKDriOzFzBU8P8tfHpvwoQAmk8S1/6NDFkWGZMNcigg+PfGUFUT/z/N7AGqbkI
bcJQreFODsdQuLqzfxZuPLvQnJs0b2srz8FjD31vmoeJAgMBAAGjITAfMB0GA1Ud
DgQWBBT+phodTIcUKqIU4C9JcF/Idp11OTANBgkqhkiG9w0BAQsFAAOCAQEAKPVw
IruBJBeO6M+ugMfWkS4KjSLI3iLjeqq/9xJfFPf4/PLQvIzsqbRfY8NeIXQUYceU
IosdrOLqICxA3VB/+fBv0OjKKbwOs1VqIbiWxSAO+7tldJzd+17SKD2uSze2mdJz
ujQWZmknLe2ycew1IdFeoPvW3TSYmHqiO0xfgHLF2862FlZJBizVLuwdm5blTSjD
yE0zOjB1p5WhgY1bk6X5sBAhX6SaAljl5F+8a3q1BiGfoR2LxW2B8W+zH7xBakTp
jbeRDp2yB4ftpiWCgFkcZflI2vwGhvEIWPrC7lhs2qaG2NMvsKXl/1Kfx/5+YP8K
0CjGStfHCG9osGqAOQ==
-----END CERTIFICATE-----`,
};
