import { ElectrumClient } from '../src';

const main = async () => {
  const client = new ElectrumClient('electrum.bitaroo.net', 50001, 'tcp');
  // const client = new ElectrumClient('fortress.qtornado.com', 50002, 'ssl');

  try {
    const ver = await client.server_version('electrum-ts', '1.4.2');
    console.log(ver);
  } finally {
    client.close();
  }
};

main().catch(console.error);
