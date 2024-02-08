import { ElectrumClient } from '../src';

const main = async () => {
  const client = new ElectrumClient('fortress.qtornado.com', 50002, 'ssl');

  const txid =
    process.argv[2] ||
    '59ff473ae08bc67bf92b6ca7c7898710e3c038b650dd3e2f2d55d9d098cfc345';

  try {
    // await client.server_version('electrum-ts', '1.4.2');

    const tx = await client.blockchain_transaction_get(txid, true);

    const richTx = await client.enrich_tx(tx);

    console.log(richTx);
  } finally {
    client.close();
  }
};

main().catch(console.error);
