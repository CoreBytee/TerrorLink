import type { ElysiaWS } from "elysia/ws";
import type NetworkManager from "./NetworkManager";
import { WSMessageType, type UDPMessage, type WSMessage } from "networking";
import type { JSONValue } from "../../../terrorlink-client/types/JSONValue";
import { env } from "bun";
import Encryption from "../../../../packages/encryption";

export default class NetworkClient {
	networkManager: NetworkManager;
	ws: ElysiaWS;
	steamId: string;
	encryption: Encryption;
	address?: {
		address: string;
		port: number;
	};
	constructor(networkManager: NetworkManager, ws: ElysiaWS, steamId: string) {
		this.networkManager = networkManager;
		this.ws = ws;
		this.steamId = steamId;
		this.encryption = new Encryption();

		this.sendWSMessage(WSMessageType.Hello, {
			host: env.NETWORK_HOST,
			port: env.NETWORK_PORT,
		});
	}

	async sendWSMessage(type: WSMessageType, data: JSONValue) {
		this.ws.send({ type, data });
	}

	async sendUDPMessage(type: number, data: Buffer) {
		if (!this.address) return;
		this.networkManager.udpServer.sendMessage(
			type,
			data,
			this.address.address,
			this.address.port,
		);
	}

	async handleWSMessage({
		type,
		data,
	}: WSMessage<{ address: string; port: number }>) {
		console.log(type, data);
		switch (type) {
			case WSMessageType.Identity:
				this.address = data;
				this.sendWSMessage(WSMessageType.Ready, {
					key: this.encryption.generateKey().toJSON().data,
				});
				break;

			default:
				break;
		}
	}

	async handleUDPMessage({ type, data }: UDPMessage) {
		console.log(type, data);
	}
}
