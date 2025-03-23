import { EventEmitter } from "node:events";
import type { TerrorLinkClient } from "../TerrorLinkClient";
import WebSocket from "./NetworkingWebSocket";
import UdpSocket from "./NetworkingUdpSocket";
import {
	UDPMessageType,
	WSMessageType,
	type UDPMessage,
	type WSMessage,
} from "networking";
import Encryption from "../../../../packages/encryption";
import type { GameStateData } from "gamestate";

export default class Networking extends EventEmitter {
	terrorLink: TerrorLinkClient;
	encryption: Encryption;
	webSocket: WebSocket;
	udpSocket: UdpSocket;
	connected = false;
	constructor(terrorLink: TerrorLinkClient) {
		super();
		this.terrorLink = terrorLink;
		this.encryption = new Encryption();
		this.webSocket = new WebSocket();
		this.udpSocket = new UdpSocket();

		this.webSocket.on(
			"message",
			async ({ type, data }: WSMessage<{ host: string; port: number }>) => {
				if (type !== WSMessageType.Hello) return;
				await this.udpSocket.connect(data.host, data.port);
				const identity = await this.udpSocket.identify();
				this.webSocket.sendMessage(WSMessageType.Identity, identity);
			},
		);

		this.webSocket.on(
			"message",
			async ({ type, data }: WSMessage<{ key: number[] }>) => {
				if (type !== WSMessageType.Ready) return;
				console.log("WS: Received encryption key");
				this.encryption.setKey(Buffer.from(data.key));
				this.connected = true;
				console.log("NETWORK: Ready to send and receive messages");
				this.emit("connected");
			},
		);

		this.webSocket.on("disconnected", async () => {
			await this.disconnect();
		});

		this.udpSocket.on("message", ({ type, data }: UDPMessage) => {
			if (type !== UDPMessageType.Voice) return;
			const decrypted = this.encryption.decrypt(data);
			const userId = decrypted.readUInt32LE(0);
			const voiceData = decrypted.subarray(4);
			this.emit("voice", { userId, data: voiceData });
		});

		this.webSocket.on(
			"message",
			async ({ type, data }: WSMessage<GameStateData>) => {
				if (type !== WSMessageType.GameState) return;
				this.emit("gamestate", data);
			},
		);
	}

	async connect() {
		const token = this.terrorLink.steamAccount.token;
		if (!token) throw new Error("No token found");
		this.webSocket.connect(`${this.terrorLink.wsUrl}/api/socket`, token);
	}

	async disconnect() {
		this.connected = false;
		await this.webSocket.disconnect();
		await this.udpSocket.disconnect();
		this.encryption.setKey(null);
		this.emit("disconnected");
	}

	async sendVoice(data: Buffer) {
		const encrypted = this.encryption.encrypt(data);
		await this.udpSocket.sendMessage(UDPMessageType.Voice, encrypted);
	}
}
