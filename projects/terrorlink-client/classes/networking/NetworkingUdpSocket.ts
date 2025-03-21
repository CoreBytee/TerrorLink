import type { udp } from "bun";
import {
	buildUDPMessage,
	parseUDPMessage,
	UDPMessageType,
	type UDPMessage,
} from "networking";
import { EventEmitter } from "node:events";
import { pEvent } from "p-event";

export default class NetworkingUdpSocket extends EventEmitter {
	private udpsocket: udp.ConnectedSocket<"buffer"> | null = null;

	sentBytes = 0;
	receivedBytes = 0;
	droppedBytes = 0;
	sentMessages = 0;
	receivedMessages = 0;
	droppedMessages = 0;

	async connect(hostname: string, port: number) {
		console.log(`UDP: Connecting to udp://${hostname}:${port}`);
		this.udpsocket = await Bun.udpSocket({
			connect: {
				hostname,
				port,
			},
			socket: {
				data: (socket, rawMessage) => {
					const message = parseUDPMessage(rawMessage);
					if (message === null) {
						console.error("UDP: Received malformed message, dropping");
						this.emit("drop");
						this.droppedBytes += rawMessage.byteLength;
						this.droppedMessages++;
						return;
					}

					this.receivedBytes += rawMessage.byteLength;
					this.receivedMessages++;

					this.emit("message", message);
				},
			},
		});
	}

	async disconnect() {
		if (!this.udpsocket) return;
		console.log("UDP: Disconnecting");
		this.udpsocket?.close();
		this.udpsocket = null;

		this.sentBytes = 0;
		this.receivedBytes = 0;
		this.sentMessages = 0;
		this.receivedMessages = 0;
		this.droppedMessages = 0;
	}

	async sendMessage(type: UDPMessageType, data: Buffer) {
		if (!this.udpsocket) throw new Error("UDP socket not connected");
		this.sentBytes += data.byteLength;
		this.sentMessages++;
		const builtMessage = buildUDPMessage(type, data);
		this.udpsocket.send(builtMessage);
	}

	async identify() {
		console.log("UDP: Attempting to identify");
		const sendInterval = setInterval(() => {
			this.sendMessage(UDPMessageType.Identify, Buffer.alloc(0));
		}, 1000);

		const identityPacket = await pEvent(
			this,
			"message",
			({ type }) => type === UDPMessageType.Identity,
		);

		clearInterval(sendInterval);

		const identity = {
			address: identityPacket.data
				.subarray(0, identityPacket.data.indexOf(0))
				.toString("utf-8"),
			port: identityPacket.data.readUint16BE(64),
		};

		console.log(
			`UDP: Received identity as udp://${identity.address}:${identity.port}`,
		);
		return identity;
	}
}
