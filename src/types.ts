export interface Logger {
  error: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
}

export type ServerVersion = [
  string, // client version
  string, // protocol version
];

export type PeersSubscribeResult = Array<
  [string, string, [string, string, string, string]]
>;

export type Balance = {
  confirmed: number;
  unconfirmed: number;
};

export interface ConfirmedTx {
  height: number;
  tx_hash: string;
}

export interface MempoolTx extends ConfirmedTx {
  fee: number;
}

export interface UnspendTx extends ConfirmedTx {
  tx_pos: number;
  value: number;
}

export type ScriptHashStatus = string;

export type HeadersSubscribeResult = {
  height: number;
  hex: string;
};

export interface BlockHeader {
  branch: string[];
  header: string;
  root: string;
}

export interface BlockHeaders {
  count: number;
  hex: string;
  max: number;
}

export interface RichBlockHeaders extends BlockHeaders {
  root: string;
  branch: string[];
}

export type ScriptSig = {
  asm: string;
  hex: string;
};

export interface ScriptPubkey extends ScriptSig {
  reqSigs: number;
  type: string;
  addresses?: Array<string>;
  address?: string;
  desc?: string;
}

export type Vout = {
  value: number;
  n: number;
  scriptPubKey: ScriptPubkey;
};

export type Vin = {
  txid: string;
  vout: number;
  scriptSig: ScriptSig;
  sequence: number;
  prevout?: Vout;
  txinwitness?: string[];
};

export interface Tx {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<Vin>;
  vout: Array<Vout>;
  hex: string;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
}

export type Txn<T extends boolean> = T extends true ? Tx : string;

export interface Merkle {
  block_height: number;
  merkle: string[];
  pos: number;
}

export type FeeHistogram = Array<[number, number]>;

export interface VinWithPrevout extends Vin {
  prevout: Vout;
}

export interface RichTx extends Tx {
  vin: Array<VinWithPrevout>;
  merkle: Merkle;
  height: number;
  fee: number;
  fee_in_sat: number;
  input_total: number;
  output_total: number;
}
