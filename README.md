# electrum-ts

Electrum is a Bitcoin wallet and lightweight Bitcoin client. For more details about Electrum, please visit [https://electrum.org/](https://electrum.org/).

The Electrum client communicates with ElectrumX using JSON-RPC 2.0 and adheres to the ElectrumX protocol.

This repository is an implementation of an ElectrumX client in TypeScript.

## Installation

```bash
npm install --save git@github.com:buildpeak/electrum-ts.git#master
```

## Usage

```typescript
import { ElectrumClient } from '@buildpeak/electrum-ts';

const main = async () => {
  const client = new ElectrumClient('fortress.qtornado.com', 50002, 'ssl');

  const txid =
    process.argv[2] ||
    '59ff473ae08bc67bf92b6ca7c7898710e3c038b650dd3e2f2d55d9d098cfc345';

  try {
    const tx = await client.blockchain_transaction_get(txid, true);

    const richTx = await client.enrich_tx(tx);

    console.log(richTx);
  } finally {
    client.close();
  }
};

main().catch(console.error);
```

## References

- [electrum protocol](https://electrumx.readthedocs.io/en/latest/protocol.html)
- [electrum protocol methods](https://electrumx.readthedocs.io/en/latest/protocol-methods.html)
- [electrumx server](https://electrumx.readthedocs.io/en/latest/)
