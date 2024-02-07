export type ServerVersionOutput = [
  string, // client version
  string, // protocol version
];

export type PeersSubscribeResult = Array<
  [string, string, [string, string, string, string]]
>;

export type BalanceOutput = {
  confirmed: number;
  unconfirmed: number;
};

export interface ConfirmedTransactionOutput {
  height: number;
  tx_hash: string;
}

export interface UnconfirmedTransactionOutput
  extends ConfirmedTransactionOutput {
  fee: number;
}

export interface UnspentOutput extends ConfirmedTransactionOutput {
  tx_pos: number;
  value: number;
}

export type ScriptHashStatus = string;

export type HeadersSubscribeOutput = {
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

export interface BlockHeadersDetail extends BlockHeaders {
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

export type FeeHistogram = Array<[number, number]>;
