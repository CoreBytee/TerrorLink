import type { ServerWebSocket } from "bun";
import type { JSONValue } from "jsonvalue";
import type { Message, MessageType } from "networking";
import type { ServerWebSocketData } from "./WebServer";
import type { SteamUserData } from "../SteamAuthentication";

export default class Client {
    ws: ServerWebSocket<ServerWebSocketData>;
    peerId: string;
    user: SteamUserData;
    constructor(ws: ServerWebSocket<ServerWebSocketData>) {
        this.ws = ws;
        this.peerId = ws.data.peerId;
        this.user = ws.data.user;
    }

    sendMessage<Payload = JSONValue>(type: MessageType, data: Payload) {
        const rawMessage = JSON.stringify({
            type,
            payload: data,
        });
        this.ws.send(rawMessage);
    }

    handleMessage(rawMessage: string) {
        const message = JSON.parse(rawMessage) as Message;

    }
}