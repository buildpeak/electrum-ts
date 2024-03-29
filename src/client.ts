import EventEmitter from 'events';
import tls from 'tls';
import ws from 'ws';
import { addressToScriptHash } from './btc-util';
import { JSONRPC, JSONRPCResponse } from './json-rpc';
import { TCPSocketClient } from './transport/tcp';
import { TLSSocketClient } from './transport/tls';
import { WebSocketClient } from './transport/ws';
import {
  Balance,
  BlockHeader,
  BlockHeaders,
  FeeHistogram,
  HeadersSubscribeResult,
  Logger,
  MempoolTx,
  Merkle,
  PeersSubscribeResult,
  RichBlockHeaders,
  RichTx,
  ScriptHashStatus,
  ServerVersion,
  Tx,
  Txn,
  UnspendTx,
  Vin,
  VinWithPrevout,
} from './types';
import { consoleLogger } from './util';

const MaxBatchSize = 80;

export type Options = {
  maxBatchSize?: number;
  logger?: Logger;
} & (tls.TLSSocketOptions | ws.ClientOptions);

export interface GetAddressRichHistoryOptions {
  afterHeight?: number;
  beforeHeight?: number;
  inclusive?: boolean;
  OnlyConfirmedTx?: boolean;
}

export class ElectrumClient {
  public readonly socket: TCPSocketClient | TLSSocketClient | WebSocketClient;
  private msgId = 1;
  private logger: Logger;
  private _subscriptions: EventEmitter;
  private listeners: Map<string, (res: JSONRPCResponse) => void> = new Map();
  private maxBatchSize = MaxBatchSize;

  public clientName = 'electrum-ts';
  public protocolVersion = '1.4.2';

  public constructor(
    host: string,
    port: number,
    protocol: string,
    options: Options = {},
  ) {
    switch (protocol) {
      case 'tcp':
        this.socket = new TCPSocketClient(host, port, options);
        break;
      case 'ssl':
      case 'tls':
        this.socket = new TLSSocketClient(
          host,
          port,
          options as tls.TLSSocketOptions,
        );
        break;
      case 'ws':
        this.socket = new WebSocketClient(
          `ws://${host}:${port}`,
          options as ws.ClientOptions,
        );
        break;
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }

    if (options.maxBatchSize) {
      this.maxBatchSize = options.maxBatchSize as number;
    }

    this.logger = options.logger || consoleLogger();

    this._subscriptions = new EventEmitter();

    this.socket.on('message', (data) => {
      this.logger.debug('Received message: %j', data);

      const msg = JSON.parse(data);

      // check if it's a JSON-RPC batch response
      if (msg instanceof Array) {
        for (const resp of msg) {
          this.handleResponse(resp);
        }
        return;
      } else if (msg.id === undefined || msg.id === null) {
        // it's a notification
        this._subscriptions.emit(msg.method, msg.params);
      } else {
        // it's a response
        this.handleResponse(msg);
      }
    });

    this.socket.on('error', (err) => {
      this.logger.error('Socket error', err);
      this.socket.close();
    });

    this.socket.on('connect', () => {
      this.logger.debug('Socket connected');
    });
  }

  public waitForConnection() {
    return new Promise((resolve) => {
      if (this.socket.state === 'connected') {
        resolve(true);
      } else {
        this.socket.on('connect', resolve);
      }
    });
  }

  private nextMsgId(): number | string {
    return this.msgId++;
  }

  private handleResponse(response: JSONRPCResponse) {
    const handler = this.listeners.get(response.id.toString());

    if (handler) {
      handler(response);
      this.listeners.delete(response.id.toString());
    }
  }

  private async listenForResponse<T>(id: number | string): Promise<T> {
    this.logger.debug('Listening for response: %s', id);

    return new Promise((resolve, reject) => {
      this.listeners.set(id.toString(), (response) => {
        if ('result' in response) {
          resolve(<T>response.result);
        } else {
          reject(response.error);
        }
      });
    });
  }

  public async request<T>(method: string, params: unknown[]): Promise<T> {
    await this.waitForConnection();

    const req = JSONRPC.makeRequest(method, params, this.nextMsgId());

    this.logger.debug('Sending request: %j', req);

    // send request
    this.socket.send(JSON.stringify(req) + '\n');

    // wait for response
    return await this.listenForResponse<T>(req.id);
  }

  public async requestBatch<T>(
    requests: {
      method: string;
      params: unknown[];
    }[],
  ): Promise<T[]> {
    await this.waitForConnection();

    const reqs = requests.map((req) =>
      JSONRPC.makeRequest(req.method, req.params, this.nextMsgId()),
    );

    this.logger.debug('Sending batch request: %j', reqs);

    // send request
    this.socket.send(JSON.stringify(reqs) + '\n');

    // wait for response
    return await Promise.all(
      reqs.map((req) => this.listenForResponse<T>(req.id)),
    );
  }

  public close() {
    this.logger.debug('Closing client', this.socket.constructor.name);
    this.socket.close();
  }

  public subscribe(event: string, listener: (...args: unknown[]) => void) {
    this._subscriptions.on(event, listener);
  }

  // Some Wrappers to simplify the ElectrumX API
  public get_address_balance(
    address: string,
    network: 'bitcoin' | 'testnet' = 'bitcoin',
  ) {
    const scriptHash = addressToScriptHash(address, network);

    return this.blockchain_scripthash_getBalance(scriptHash);
  }

  public get_address_history(
    address: string,
    network: 'bitcoin' | 'testnet' = 'bitcoin',
  ) {
    const scriptHash = addressToScriptHash(address, network);

    return this.blockchain_scripthash_getHistory(scriptHash);
  }

  public async get_address_rich_history(
    address: string,
    network: 'bitcoin' | 'testnet' = 'bitcoin',
    options?: GetAddressRichHistoryOptions,
  ): Promise<RichTx[]> {
    const { afterHeight, beforeHeight, inclusive, OnlyConfirmedTx } =
      options || {};

    const history = await this.get_address_history(address, network);

    if (afterHeight && beforeHeight && afterHeight > beforeHeight) {
      throw new Error('afterHeight must be less than beforeHeight');
    }

    // skip transactions before afterHeight or after beforeHeight
    const filteredHistory = history.filter((tx) => {
      if (tx.height <= 0) {
        return OnlyConfirmedTx ? false : true;
      }

      if (
        afterHeight &&
        (tx.height < afterHeight || (!inclusive && tx.height === afterHeight))
      ) {
        return false;
      }

      if (
        beforeHeight &&
        (tx.height > beforeHeight || (!inclusive && tx.height === beforeHeight))
      ) {
        return false;
      }

      return true;
    });

    const rickTxs: RichTx[] = [];

    const promises: Array<Promise<RichTx[]>> = [];

    for (let i = 0; i < filteredHistory.length; i += this.maxBatchSize) {
      const batch = filteredHistory.slice(i, i + this.maxBatchSize);
      const p = async () => {
        const hashes = batch.map((tx) => tx.tx_hash);
        const txs = await this.get_transactions_batch(hashes);

        return Promise.all(
          txs.map((tx, i) => this.enrich_tx(tx, filteredHistory[i].height)),
        );
      };
      promises.push(p());
    }

    const results = await Promise.all(promises);

    for (const result of results) {
      rickTxs.push(...result);
    }

    return rickTxs;
  }

  public get_transactions_batch(hashes: string[]) {
    return this.requestBatch<Txn<true>>(
      hashes.map((hash) => ({
        method: 'blockchain.transaction.get',
        params: [hash, true],
      })),
    );
  }

  public async enrich_vin(vins: Vin[]) {
    const hashes = vins.filter((v) => v.txid).map((v) => v.txid);

    const vinWithPrevouts: VinWithPrevout[] = [];

    const promises: Array<Promise<VinWithPrevout[]>> = [];

    for (let i = 0; i < hashes.length; i += this.maxBatchSize) {
      const batchHashes = hashes.slice(i, i + this.maxBatchSize);

      const p = async () => {
        const txs = await this.get_transactions_batch(batchHashes);

        const richVins = [];

        for (let j = 0; j < txs.length; j++) {
          const tx = txs[j];
          richVins.push({
            ...vins[i + j],
            prevout: tx.vout[vins[i + j].vout],
          });
        }

        return richVins;
      };

      promises.push(p());
    }

    const results = await Promise.all(promises);

    results.forEach((vin) => vinWithPrevouts.push(...vin));

    return vinWithPrevouts;
  }

  public async enrich_tx(tx: Tx, height: number = 0) {
    let txMerkle;

    if (height > 0) {
      txMerkle = await this.blockchain_transaction_getMerkle(tx.txid, height);
    }

    const vinWithPrevouts = await this.enrich_vin(tx.vin);

    if (vinWithPrevouts.length !== tx.vin.length) {
      throw new Error('Failed to enrich vin');
    }

    const outputTotal = tx.vout.reduce(
      (total, output) => total + output.value,
      0,
    );

    const inputTotal = vinWithPrevouts.reduce(
      (total, vin) => total + vin.prevout.value,
      0,
    );

    const fee = parseFloat((inputTotal - outputTotal).toFixed(8));

    return <RichTx>{
      ...tx,
      vin: vinWithPrevouts,
      merkle: txMerkle,
      output_total: outputTotal,
      input_total: inputTotal,
      fee: fee,
      fee_in_sat: fee * 1e8,
    };
  }

  // ElectrumX API
  public server_version(clientName: string, protocolVersion: string) {
    return this.request<ServerVersion>('server.version', [
      clientName,
      protocolVersion,
    ]);
  }

  public async server_banner(): Promise<string> {
    const res = await this.request<string>('server.banner', []);
    return res;
  }

  public server_ping(): Promise<null> {
    return this.request<null>('server.ping', []);
  }

  public server_addPeer(features: Record<string, unknown>) {
    return this.request('server.add_peer', [features]);
  }

  public server_donation_address() {
    return this.request('server.donation_address', []);
  }

  public server_features() {
    return this.request('server.features', []);
  }

  public server_peers_subscribe() {
    return this.request<PeersSubscribeResult>('server.peers.subscribe', []);
  }

  public blockchain_address_getProof(address: string) {
    return this.request('blockchain.address.get_proof', [address]);
  }

  public blockchain_dotnav_resolveName(name: string, subdomains: string) {
    return this.request('blockchain.dotnav.resolve_name', [name, subdomains]);
  }

  public blockchain_scripthash_getBalance(scripthash: string) {
    return this.request<Balance>('blockchain.scripthash.get_balance', [
      scripthash,
    ]);
  }

  public blockchain_scripthash_getHistory(
    scripthash: string,
    height = 0,
    to_height = -1,
  ) {
    if (this.protocolVersion == '1.5') {
      return this.request<MempoolTx[]>('blockchain.scripthash.get_history', [
        scripthash,
        height,
        to_height,
      ]);
    } else {
      return this.request<MempoolTx[]>('blockchain.scripthash.get_history', [
        scripthash,
      ]);
    }
  }

  public blockchain_scripthash_getMempool(
    scripthash: string,
  ): Promise<MempoolTx[]> {
    return this.request<MempoolTx[]>('blockchain.scripthash.get_mempool', [
      scripthash,
    ]);
  }

  public blockchain_scripthash_listunspent(
    scripthash: string,
  ): Promise<UnspendTx[]> {
    return this.request<UnspendTx[]>('blockchain.scripthash.listunspent', [
      scripthash,
    ]);
  }

  public blockchain_scripthash_subscribe(
    scripthash: string,
  ): Promise<ScriptHashStatus> {
    return this.request<ScriptHashStatus>('blockchain.scripthash.subscribe', [
      scripthash,
    ]);
  }

  public blockchain_scripthash_unsubscribe(scripthash: string) {
    return this.request<boolean>('blockchain.scripthash.unsubscribe', [
      scripthash,
    ]);
  }

  public blockchain_block_header(
    height: number,
    cpHeight = 0,
  ): Promise<string | BlockHeader> {
    return this.request('blockchain.block.header', [height, cpHeight]);
  }

  public blockchain_block_headers(
    startHeight: number,
    count: number,
    cpHeight = 0,
  ): Promise<BlockHeaders | RichBlockHeaders> {
    return this.request('blockchain.block.headers', [
      startHeight,
      count,
      cpHeight,
    ]);
  }

  public blockchain_estimatefee(number: number): Promise<number> {
    return this.request<number>('blockchain.estimatefee', [number]);
  }

  public blockchain_headers_subscribe(): Promise<HeadersSubscribeResult> {
    return this.request<HeadersSubscribeResult>(
      'blockchain.headers.subscribe',
      [],
    );
  }

  public blockchain_relayfee(): Promise<number> {
    return this.request('blockchain.relayfee', []);
  }

  public blockchain_transaction_broadcast(rawtx: string): Promise<string> {
    return this.request<string>('blockchain.transaction.broadcast', [rawtx]);
  }

  public blockchain_transaction_get<T extends boolean>(
    txHash: string,
    verbose: T = false as T,
  ): Promise<Txn<T>> {
    return this.request<Txn<T>>('blockchain.transaction.get', [
      txHash,
      verbose,
    ]);
  }

  public blockchain_transaction_getMerkle(tx_hash: string, height: number) {
    return this.request<Merkle>('blockchain.transaction.get_merkle', [
      tx_hash,
      height,
    ]);
  }

  public mempool_getFeeHistogram() {
    return this.request<FeeHistogram>('mempool.get_fee_histogram', []);
  }
}
