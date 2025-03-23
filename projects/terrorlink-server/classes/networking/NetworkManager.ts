import { EventEmitter } from "node:events";
import NetworkClient from "./NetworkClient";
import WebServer from "./WebServer";
import { UdpServer } from "./UdpServer";
import { UDPMessageType, type UDPMessage } from "networking";

export default class NetworkManager extends EventEmitter {
	clients: Record<string, NetworkClient>;
	webServer: WebServer;
	udpServer: UdpServer;
	constructor(port: number) {
		super();
		this.clients = {};
		this.webServer = new WebServer(port);
		this.udpServer = new UdpServer(port);

		this.webServer.on("gamestate_update", async (data) => {
			this.emit("gamestate_update", data);
		});

		this.webServer.on("client_connected", async (event) => {
			this.clients[event.client.id] = new NetworkClient(
				this,
				event.client,
				event.steamData.id as string,
			);
		});

		this.webServer.on("client_disconnected", async (event) => {
			delete this.clients[event.client.id];
		});

		this.webServer.on("client_message", async ({ client, message }) => {
			this.clients[client.id].handleWSMessage(message);
		});

		this.udpServer.on(
			"message",
			async ({ type, data, address, port }: UDPMessage<true>) => {
				if (type === UDPMessageType.Identify) {
					const addressBuffer = Buffer.alloc(64);
					addressBuffer.write(address!, 0, "utf-8");
					const portBuffer = Buffer.alloc(2);
					portBuffer.writeUInt16BE(port!, 0);

					return await this.udpServer.sendMessage(
						UDPMessageType.Identity,
						Buffer.from([...addressBuffer, ...portBuffer]),
						address!,
						port!,
					);
				}

				const client = Object.values(this.clients).find(
					(client) =>
						client.address?.address === address &&
						client.address?.port === port,
				);

				if (!client) return;
				client.handleUDPMessage({ type, data });
			},
		);
	}

	getClient(steamId: string) {
		return this.listClients().find((client) => client.steamId === steamId);
	}

	listClients() {
		return Object.values(this.clients);
	}
}
