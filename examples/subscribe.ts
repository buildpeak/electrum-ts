import { ElectrumClient } from '../src';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  try {
    const client = new ElectrumClient('fortress.qtornado.com', 50002, 'tls');

    client.subscribe('blockchain.headers.subscribe', console.log);
    client.subscribe('blockchain.scripthash.subscribe', console.log);

    const header = await client.blockchain_headers_subscribe();
    console.log('Latest header:', header);

    const scripthashStatus = await client.blockchain_scripthash_subscribe(
      'f3aa57a41424146327e5c88c25db8953dd16c6ab6273cdb74a4404ed4d0f5714',
    );
    console.log('Latest scripthash status:', scripthashStatus);

    console.log('Waiting for notifications...');

    const stop = false;

    while (!stop) {
      // Keep connection alive.
      await sleep(20_000);
      await client.server_ping();
    }
  } catch (e) {
    console.error(e);
  }
};

main().catch(console.error);
