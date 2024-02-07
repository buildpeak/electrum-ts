export type JSONRPCRequest = {
  jsonrpc: '2.0';
  method: string;
  params: unknown[];
  id: number | string;
};

export type JSONRPCResponse =
  | {
      jsonrpc: '2.0';
      result: unknown;
      id: number | string;
    }
  | {
      jsonrpc: '2.0';
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
      id: number | string;
    };

export class JSONRPC {
  static makeRequest(method: string, params: unknown[], id: number | string) {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id,
    };
  }
}
