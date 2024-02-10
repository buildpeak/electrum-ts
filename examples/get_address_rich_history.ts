import { ElectrumClient } from '../src';

const main = async () => {
  const client = new ElectrumClient('fortress.qtornado.com', 50002, 'ssl');

  const address = process.argv[2] || '12x4BLySpikcM5JkVUdwdusbu3NcPFpCeo';

  try {
    const history = await client.get_address_rich_history(address);

    console.log(history);
  } finally {
    client.close();
  }
};

main().catch(console.error);
