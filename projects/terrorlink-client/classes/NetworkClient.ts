import type { udp } from "bun";
import type { TerrorLinkClient } from "./TerrorLinkClient";
import { pEvent } from "p-event";
import { EventEmitter } from "node:events";
import {
	UDPMessageType,
	WSMessageType,
	type UDPMessage,
	type WSMessage,
} from "networking";

export default class NetworkClient extends EventEmitter {
	terrorLink: TerrorLinkClient;
	websocket: WebSocket | null = null;
	udpsocket: udp.ConnectedSocket<"buffer"> | null = null;
	constructor(terrorLink: TerrorLinkClient) {
		super();
		this.terrorLink = terrorLink;

		this.connect();
	}

	async connect() {
		console.log(`Connecting to ${this.terrorLink.wsUrl}/api/socket`);
		this.websocket = new WebSocket(`${this.terrorLink.wsUrl}/api/socket`, {
			headers: {
				"x-steam-token": this.terrorLink.steamAccount.token,
			},
		} as unknown as string[]);

		this.websocket.addEventListener("message", (event) => {
			let parsed: WSMessage;
			try {
				parsed = JSON.parse(event.data);
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error);
				return;
			}

			this.handleWSMessage(parsed.type, parsed.data);
			this.emit("websocket_message", parsed);
		});

		this.websocket.addEventListener("close", async () => {
			console.log("Websocket closed, reconnecting...");
			await this.reconnect();
		});

		const helloMessage = await pEvent(
			this,
			"websocket_message",
			(message) => message.type === WSMessageType.Hello,
		);

		const connectionDetails = helloMessage.data as {
			host: string;
			port: number;
		};

		console.log("Websocket connected...");
		console.log(
			`Connecting to udp://${connectionDetails.host}:${connectionDetails.port}`,
		);

		this.udpsocket = await Bun.udpSocket({
			connect: {
				port: connectionDetails.port,
				hostname: connectionDetails.host,
			},
			socket: {
				data: (socket, message, port, address) => {
					const hash = message.readBigUInt64BE(0);
					const currentHash = Bun.hash(message.subarray(8));
					const type = message.readUInt8(8);
					const data = message.subarray(9);

					if (hash !== currentHash) {
						console.error("Hashes do not match, dropping packet");
						this.emit("udp_drop", { type, data });
						return;
					}

					this.emit("udp_message", { type, data });
					this.handleUDPMessage(type, data);
				},
			},
		});

		let identityPacket: UDPMessage;
		while (true) {
			this.sendUDPMessage(UDPMessageType.Identify, Buffer.from([]));
			try {
				identityPacket = await pEvent(this, "udp_message", {
					rejectionEvents: ["udp_drop"],
					timeout: 5000,
					filter: ({ type }) => type === UDPMessageType.Identity,
				});
				break;
			} catch (error) {
				console.error("Failed to receive identity message, retrying...");
			}
		}

		const identity = {
			address: identityPacket.data
				.subarray(0, identityPacket.data.indexOf(0))
				.toString("utf-8"),
			port: identityPacket.data.readUint16BE(64),
		};

		console.log(`Received identity as ${identity.address}:${identity.port}`);

		await this.sendWSMessage(WSMessageType.Identity, identity);

		const readyMessage = await pEvent(
			this,
			"websocket_message",
			(message) => message.type === WSMessageType.Ready,
		);

		console.log(readyMessage);
	}

	async disconnect() {
		this.websocket?.close();
		this.udpsocket?.close();
	}

	async reconnect() {
		await Bun.sleep(1000);
		await this.disconnect();
		await this.connect();
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private async handleWSMessage(type: WSMessageType, data: any) {}

	private async handleUDPMessage(type: UDPMessageType, data: Buffer) {}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private async sendWSMessage(type: WSMessageType, data: any) {
		if (!this.websocket) {
			throw new Error("WebSocket not connected");
		}

		const message = JSON.stringify({ type, data });
		this.websocket.send(message);
	}

	private async sendUDPMessage(type: UDPMessageType, data: Buffer) {
		if (!this.udpsocket) {
			throw new Error("UDP socket not connected");
		}
		const message = Buffer.alloc(1 + 8 + data.byteLength);

		// write hash
		const body = Buffer.concat([Buffer.from([type]), data]);
		const hash = Bun.hash(body) as bigint;
		message.writeBigUInt64BE(hash, 0);

		// write type
		message.writeUInt8(type, 8);

		// write data
		data.copy(message, 9);

		this.udpsocket.send(message);
	}
}
