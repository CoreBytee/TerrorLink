import type { JSONValue } from "jsonvalue";
import type { Message, MessageType } from "networking";
import { EventEmitter } from "node:events";
import { pEvent } from "p-event";

export default class Events extends EventEmitter {
	socket: WebSocket | null;
	messagesReceived: number;
	bytesReceived: number;
	messagesSent: number;
	bytesSent: number;
	constructor() {
		super();
		this.socket = null;

		this.messagesReceived = 0;
		this.bytesReceived = 0;
		this.messagesSent = 0;
		this.bytesSent = 0;
	}

	get isConnected() {
		return this.socket && this.socket.readyState === WebSocket.OPEN;
	}

	async connect(peerId: string) {
		this.messagesReceived = 0;
		this.bytesReceived = 0;
		this.messagesSent = 0;
		this.bytesSent = 0;

		this.socket = new WebSocket(`/api/events?id=${peerId}`);

		this.socket.addEventListener("message", (rawMessage) => {
			const message = JSON.parse(rawMessage.data) as Message;
			this.messagesReceived++;
			this.bytesReceived += rawMessage.data.length;
			this.emit(message.type, message.payload);
		});

		console.info("Socket: Connecting to server");
		await pEvent(this.socket, "open");
		console.info("Socket: Connected to server");
		this.emit("connect");
	}

	sendMessage<Payload = JSONValue>(type: MessageType, payload: Payload) {
		const rawMessage = JSON.stringify({
			type,
			payload,
		} as Message<Payload>);

		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			console.error("Socket: Not connected to server");
			return;
		}

		this.messagesSent++;
		this.bytesSent += rawMessage.length;

		this.socket.send(rawMessage);
	}
}
