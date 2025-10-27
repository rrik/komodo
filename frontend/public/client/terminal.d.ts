import { ClientState } from "./lib";
import { ConnectTerminalQuery, ExecuteTerminalBody, InitTerminal } from "./types";
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
    execute_server_terminal: ({ server, terminal, command, init, }: {
        server: string;
        terminal?: string;
        command: string;
        init?: InitTerminal;
    }, callbacks?: ExecuteCallbacks) => Promise<void>;
    execute_container_terminal: ({ server, container, terminal, command, init, }: {
        server: string;
        container: string;
        terminal?: string;
        command: string;
        init?: InitTerminal;
    }, callbacks?: ExecuteCallbacks) => Promise<void>;
    execute_stack_service_terminal: ({ stack, service, terminal, command, init, }: {
        stack: string;
        service: string;
        terminal?: string;
        command: string;
        init?: InitTerminal;
    }, callbacks?: ExecuteCallbacks) => Promise<void>;
    execute_deployment_terminal: ({ deployment, terminal, command, init, }: {
        deployment: string;
        terminal?: string;
        command: string;
        init?: InitTerminal;
    }, callbacks?: ExecuteCallbacks) => Promise<void>;
};
