import { EventEmitter } from "node:events";
import type { JSONValue } from "../../types/JSONValue";
import type { WSMessageType } from "networking";

export type WebSocketMessage = {
	type: WSMessageType;
	data: JSONValue;
};

export default class NetworkingWebSocket extends EventEmitter {
	private webSocket: WebSocket | null = null;

	sentBytes = 0;
	receivedBytes = 0;
	sentMessages = 0;
	receivedMessages = 0;

	async connect(url: string, token: string) {
		console.log(`WS: Connecting to ${url}`);
		this.webSocket = new WebSocket(url, {
			headers: {
				"x-steam-token": token,
			},
		} as unknown as string[]);

		this.webSocket.addEventListener("message", (event) => {
			this.handleMessage(event.data);
		});

		this.webSocket.addEventListener("open", () => {
			console.log("WS: Connection successful");
			this.emit("connected");
		});

		this.webSocket.addEventListener("close", async (event) => {
			console.log(`WS: Connection closed (${event.reason})`);
			this.emit("disconnected");
		});
	}

	async disconnect() {
		console.log("WS: Disconnecting");
		this.webSocket?.close();
		this.webSocket = null;

		this.sentBytes = 0;
		this.receivedBytes = 0;
		this.sentMessages = 0;
		this.receivedMessages = 0;
	}

	private async handleMessage(rawMessage: string) {
		this.receivedBytes += rawMessage.length;
		this.receivedMessages++;
		try {
			const message = JSON.parse(rawMessage);
			this.emit("message", message);
		} catch (error) {
			return console.error("Failed to parse message", error);
		}
	}

	async sendMessage(type: WSMessageType, data: JSONValue) {
		if (!this.webSocket) {
			console.error("WebSocket is not connected");
			return;
		}

		const message: WebSocketMessage = {
			type,
			data,
		};

		const rawMessage = JSON.stringify(message);
		this.sentBytes += rawMessage.length;
		this.sentMessages++;

		try {
			this.webSocket.send(rawMessage);
		} catch (error) {
			console.error("Failed to send message", error);
		}
	}
}
