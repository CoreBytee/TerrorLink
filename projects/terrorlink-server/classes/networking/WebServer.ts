import { env } from "bun";
import { EventEmitter } from "node:events";
import SteamAuthentication, {
	type SteamUserData,
} from "../SteamAuthentication";
import buildUrl from "build-url";
import type { BunRequest, Server, ServerWebSocket } from "bun";
import indexHtml from "../../public/index.html";
import type { JSONPrimitive, JSONValue } from "jsonvalue";
import jwt from "jwt-simple";
import favicon from "../../public/favicon.ico";
import { Mutex } from "async-mutex";
import Client from "./Client";
import {
	type MessageActivePeersPayload,
	type MessageConnectPeerPayload,
	type MessageDisconnectPeerPayload,
	MessageType,
} from "networking";

export type ServerWebSocketData = {
	user: SteamUserData;
	peerId: string;
};

export default class WebServer extends EventEmitter {
	httpUrl: string;

	private steamAuthentication: SteamAuthentication;
	private server: Server;
	private port: string;
	private host: string;
	private ssl: boolean;
	private proxy: boolean;
	private steamToken: string;
	private gamestateToken: string;
	private jwtToken: string;

	clients: Record<string, Client>;
	connectionMutex: Mutex;
	constructor() {
		super();

		this.port = env.NETWORK_PORT as string;
		this.host = env.NETWORK_HOST as string;
		this.ssl = env.NETWORK_SSL === "true" || env.NETWORK_SSL === "1";
		this.proxy = env.NETWORK_PROXY === "true" || env.NETWORK_PROXY === "1";

		this.steamToken = env.STEAM_TOKEN as string;
		this.gamestateToken = env.GAMESTATE_TOKEN as string;
		this.jwtToken = env.JWT_SECRET as string;

		this.httpUrl = buildUrl(
			"http",
			Number.parseInt(this.port),
			this.ssl,
			this.host,
			this.proxy,
		);

		this.steamAuthentication = new SteamAuthentication(
			this.httpUrl,
			this.steamToken,
			`${this.httpUrl}/authentication/return`,
		);

		console.log("Starting webserver on", this.httpUrl);

		this.clients = {};
		this.connectionMutex = new Mutex();

		this.server = Bun.serve({
			development: env.NODE_ENV !== "production",
			port: this.port,
			routes: {
				"/": indexHtml,
				"/favicon.ico": () => new Response(Bun.file(favicon)),
				"/authentication/status": (request) => {
					const token = this.getToken(request);

					return Response.json({
						user: token,
						authenticated: !!token,
						url: this.steamAuthentication.getAuthorizationURL(),
					});
				},
				"/authentication/return": async (request) => {
					const user = await this.steamAuthentication.resolveUrl(request.url);

					if (!user)
						return new Response("Failed to authenticate", { status: 401 });

					this.setToken(request, user.toJSON());
					return Response.redirect("/", 302);
				},
				"/api/events": (request, server) => {
					const token = this.getToken(request);
					const peerId = new URL(request.url).searchParams.get("id");
					if (!token) return new Response("Unauthorized", { status: 401 });

					server.upgrade(request, {
						data: {
							user: token,
							peerId: peerId,
						},
					});
					return new Response("ok");
				},
				"/api/gamestate": async (request) => {
					if (request.headers.get("x-token") !== this.gamestateToken)
						return new Response("Unauthorized", { status: 401 });

					this.emit("gamestate", await request.json());
					return new Response("ok");
				},
			},
			websocket: {
				open: async (ws: ServerWebSocket<ServerWebSocketData>) => {
					// console.log(ws)
					const token = ws.data.user;
					const peerId = ws.data.peerId;
					console.log(token, peerId);

					const newClient = new Client(ws);
					this.clients[peerId] = newClient;

					newClient.sendMessage<MessageActivePeersPayload>(
						MessageType.ActivePeers,
						{
							peers: this.listClients()
								.map((client) => client.peerId)
								.filter((clientPeerId) => clientPeerId !== peerId),
						},
					);

					this.listClients()
						.filter((client) => client.peerId !== peerId)
						.forEach((client) => {
							client.sendMessage<MessageConnectPeerPayload>(
								MessageType.ConnectPeer,
								{
									peerId: newClient.peerId,
								},
							);
						});
				},
				message: async () => {},
				close: async (ws: ServerWebSocket<ServerWebSocketData>) => {
					const peerId = ws.data.peerId;
					delete this.clients[peerId];

					this.listClients().forEach((client) => {
						client.sendMessage<MessageDisconnectPeerPayload>(
							MessageType.DisconnectPeer,
							{
								peerId: peerId,
							},
						);
					});
				},
			},
		});
	}

	private encodeJWT(payload: JSONValue) {
		return jwt.encode(payload, this.jwtToken);
	}

	private decodeJWT(token: string) {
		try {
			return jwt.decode(token, this.jwtToken);
		} catch (error) {
			return false;
		}
	}

	private getToken(request: BunRequest) {
		const token = request.cookies.get("token");
		if (!token) return false;
		const decoded = this.decodeJWT(token);
		if (!decoded) return false;
		return decoded;
	}

	private setToken(request: BunRequest, token: Record<string, JSONPrimitive>) {
		const encoded = this.encodeJWT(token);
		request.cookies.set("token", encoded, {
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 7,
			sameSite: "strict",
		});
		return encoded;
	}

	listClients() {
		return Object.values(this.clients);
	}
}
