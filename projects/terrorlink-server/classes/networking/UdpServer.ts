import { EventEmitter } from "node:events";
import {
	buildUDPMessage,
	parseUDPMessage,
	type UDPMessageType,
} from "networking";

export class UdpServer extends EventEmitter {
	port: number;
	udp: Promise<import("bun").udp.Socket<"buffer">>;
	constructor(port: number) {
		super();
		this.port = port;

		this.udp = Bun.udpSocket({
			hostname: "0.0.0.0",
			port: this.port,
			socket: {
				data: (socket, rawMessage, port, address) => {
					const message = parseUDPMessage(rawMessage);

					if (message === null) {
						console.error("UDP: Received malformed message, dropping");
						return;
					}

					this.emit("message", {
						type: message.type,
						data: message.data,
						address,
						port,
					});
				},
			},
		});
	}

	async sendMessage(
		type: UDPMessageType,
		data: Buffer,
		address: string,
		port: number,
	) {
		const builtMessage = buildUDPMessage(type, data);
		const udp = await this.udp;
		await udp.send(builtMessage, port, address);
	}
}
