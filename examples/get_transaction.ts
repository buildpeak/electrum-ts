import { ElectrumClient } from '../src';

const main = async () => {
  const client = new ElectrumClient('fortress.qtornado.com', 50002, 'ssl');

  try {
    await client.server_version('electrum-ts', '1.4.2');

    const tx = await client.blockchain_transaction_get(
      'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
      true,
    );

    console.log(tx);

    console.log(tx.confirmations);
  } finally {
    client.close();
  }
};

main().catch(console.error);
