import { EventEmitter } from "node:events";
import { env, type udp } from "bun";
import Elysia from "elysia";
import type { ElysiaWS } from "elysia/ws";
import jwt from "jwt-simple";
import type { GameStateBody } from "../types/GameStateBody";
import SteamAuthentication from "./SteamAuthentication";
import type TerrorLinkServer from "./TerrorLinkServer";
import { UDPMessageType, WSMessageType, type WSMessage } from "networking";
import { noop } from "noop";
import crypto from "node:crypto";

// biome-ignore lint/suspicious/noExplicitAny: <shut up>
function encodeJWT(payload: Record<string, any>) {
	return jwt.encode(payload, env.JWT_SECRET as string);
}

function decodeJWT(token: string) {
	try {
		return jwt.decode(token, env.JWT_SECRET as string);
	} catch (error) {
		return false;
	}
}

class Client extends EventEmitter {
	networking: NetworkServer;
	ws: ElysiaWS;
	steamToken: string;
	address?: {
		address: string;
		port: number;
	};
	encryptionKey: Buffer<ArrayBufferLike>;
	constructor(networking: NetworkServer, ws: ElysiaWS, steamToken: string) {
		super();
		this.networking = networking;
		this.ws = ws;
		this.steamToken = steamToken;
		this.encryptionKey = crypto.randomBytes(32);

		this.sendWSMessage(WSMessageType.Hello, {
			host: env.NETWORK_HOST,
			port: env.NETWORK_PORT,
		});
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	sendWSMessage(type: WSMessageType, data: any) {
		this.ws.send({ type, data });
	}

	sendUDPMessage(type: UDPMessageType, data: Buffer) {
		if (!this.address) return;
		this.networking.sendUDPMessage(
			type,
			data,
			this.address.address,
			this.address.port,
		);
	}

	handleWSMessage(message: WSMessage) {
		const type = message.type;
		const data = message.data;

		switch (type) {
			case WSMessageType.Identity:
				this.address = data;

				this.sendWSMessage(WSMessageType.Ready, {
					key: this.encryptionKey.toJSON().data,
				});
				break;
			default:
				console.warn("Unhandled WS message type", type);
				break;
		}
	}

	handleUDPMessage(type: UDPMessageType, data: Buffer) {
		switch (type) {
			case UDPMessageType.Voice:
				this.sendUDPMessage(UDPMessageType.Voice, data);
				break;
			default:
				console.warn("Unhandled UDP message type", type);
				break;
		}
	}
}

export default class NetworkServer {
	terrorLink: TerrorLinkServer;
	port: number;
	httpUrl: string;
	wsUrl: string;
	clients: { [key: string]: Client };
	steamAuthentication: SteamAuthentication;
	app: Elysia | undefined;
	udp: udp.Socket<"buffer"> | undefined;
	constructor(terrorLink: TerrorLinkServer, port: number) {
		this.terrorLink = terrorLink;
		this.port = port;

		this.httpUrl = `http${env.NETWORK_SSL === "true" ? "s" : ""}://${env.NETWORK_HOST}:${env.NETWORK_PORT}`;
		this.wsUrl = `ws${env.NETWORK_SSL === "true" ? "s" : ""}://${env.NETWORK_HOST}:${env.NETWORK_PORT}`;

		this.clients = {};

		this.steamAuthentication = new SteamAuthentication(
			this.httpUrl,
			env.STEAM_TOKEN as string,
			`${this.httpUrl}/authenticate/steam/return`,
		);

		noop()
			.then(() => {
				this.loadElysia();
			})
			.then(() => {
				this.loadSocket();
			});
	}

	/**
	 * Loads the Elysia server
	 */
	private async loadElysia() {
		this.app = new Elysia()
			.onError((error) => console.error(error))
			.get("/", (context) => {
				return "Hello World!";
			})

			.get("/authenticate/steam", (context) => {
				context.cookie.port.value = Number.parseInt(context.query.p).toString();
				return context.redirect(this.steamAuthentication.getAuthorizationURL());
			})
			.get("/authenticate/steam/return", async (context) => {
				const steamUser = await this.steamAuthentication.resolveUrl(
					context.request.url,
				);
				console.log(steamUser);
				if (!steamUser) return;
				const jwt = encodeJWT({
					...steamUser?.toJSON(),
					type: "steam",
				});

				return context.redirect(
					`http://localhost:${context.cookie.port.value}/return?token=${jwt}`,
				);
			})

			.post("/api/gamestate", (context) => {
				if (context.headers["x-token"] !== env.GAMESTATE_TOKEN) {
					return new Response("Invalid token", { status: 401 });
				}

				return this.terrorLink.gameState.update(context.body as GameStateBody);
			})

			.ws("/api/socket", {
				open: (client) => {
					const steamToken = client.data.headers["x-steam-token"] as string;
					const steamData = decodeJWT(steamToken);
					if (!steamData) return client.close();
					this.clientConnected(client, steamData);
				},
				message: (client, message) => {
					this.clients[client.id].handleWSMessage(message as WSMessage);
				},
				close: (client) => {
					this.clientDisconnected(client);
				},
			})
			.listen(this.port, () =>
				console.log(`WebServer is running on ${this.httpUrl}`),
			);
	}

	/**
	 * Creates the udp socket
	 */
	private async loadSocket() {
		this.udp = await Bun.udpSocket({
			hostname: "0.0.0.0",
			port: this.port,
			socket: {
				data: (socket, message, port, address) => {
					const hash = message.readBigUInt64BE(0);
					const currentHash = Bun.hash(message.subarray(8));
					const type = message.readUInt8(8);
					const data = message.subarray(9);

					if (hash !== currentHash) {
						console.error("Hashes do not match, dropping packet");
						return;
					}

					this.handleUDPMessage(type, data, address, port);
				},
			},
		});
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private clientConnected(client: ElysiaWS, steam: any) {
		const newClient = new Client(this, client, steam);
		this.clients[client.id] = newClient;
	}

	private clientDisconnected(client: ElysiaWS) {
		delete this.clients[client.id];
	}

	async handleUDPMessage(
		type: UDPMessageType,
		data: Buffer,
		address: string,
		port: number,
	) {
		switch (type) {
			case UDPMessageType.Identify: {
				const addressBuffer = Buffer.alloc(64);
				addressBuffer.write(address, 0, "utf-8");
				const portBuffer = Buffer.alloc(2);
				portBuffer.writeUInt16BE(port, 0);

				this.sendUDPMessage(
					UDPMessageType.Identity,
					Buffer.from([...addressBuffer, ...portBuffer]),
					address,
					port,
				);
				break;
			}

			default: {
				const client = Object.values(this.clients).find(
					(client) =>
						client.address?.address === address &&
						client.address?.port === port,
				);

				if (!client) return;
				client.handleUDPMessage(type, data);
				break;
			}
		}
	}

	/**
	 * Send a UDP message to a client
	 * @param type The type of message
	 * @param data The data to send1
	 * @param address The address to send the message to
	 * @param port The port to send the message to
	 */
	async sendUDPMessage(
		type: UDPMessageType,
		data: Buffer,
		address: string,
		port: number,
	) {
		const message = Buffer.alloc(1 + 8 + data.byteLength);

		// write hash
		const body = Buffer.concat([Buffer.from([type]), data]);
		const hash = Bun.hash(body) as bigint;
		message.writeBigUInt64BE(hash, 0);

		// write type
		message.writeUInt8(type, 8);

		// write data
		data.copy(message, 9);

		this.udp?.send(message, port, address);
	}
}
