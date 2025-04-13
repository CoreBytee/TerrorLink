import type { JSONValue } from "jsonvalue";
import {
	MessageType,
	type Message,
	type MessageUpdatePositionsPayload,
} from "networking";
import { pEvent } from "p-event";
import { TypedEmitter } from "tiny-typed-emitter";

interface EventsEvents {
	connect: () => void;
	[MessageType.UpdatePositions]: (
		payload: MessageUpdatePositionsPayload,
	) => void;
}

export default class Events extends TypedEmitter<EventsEvents> {
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
			if (message.type === MessageType.UpdatePositions) {
				this.emit(
					message.type,
					message.payload as unknown as MessageUpdatePositionsPayload,
				);
			} else {
				console.warn(`Unhandled message type: ${message.type}`);
			}
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
