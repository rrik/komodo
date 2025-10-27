import { ClientState } from "./lib";
import { ConnectTerminalQuery, ExecuteTerminalBody } from "./types";
export type TerminalCallbacks = {
    on_message?: (e: MessageEvent<any>) => void;
    on_login?: () => void;
    on_open?: () => void;
    on_close?: () => void;
};
export type ExecuteCallbacks = {
    onLine?: (line: string) => void | Promise<void>;
    onFinish?: (code: string) => void | Promise<void>;
};
export declare const terminal_methods: (url: string, state: ClientState) => {
    connect_terminal: ({ query: { target, terminal, init }, on_message, on_login, on_open, on_close, }: {
        query: ConnectTerminalQuery;
    } & TerminalCallbacks) => WebSocket;
    execute_terminal: (request: ExecuteTerminalBody, callbacks?: ExecuteCallbacks) => Promise<void>;
    execute_terminal_stream: (request: ExecuteTerminalBody) => Promise<AsyncIterable<string>>;
};
