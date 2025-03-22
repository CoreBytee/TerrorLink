import buildUrl from "build-url";
import { EventEmitter } from "node:events";
import { env } from "bun";
import Elysia from "elysia";
import jwt from "jwt-simple";
import type { JSONValue } from "../../../terrorlink-client/types/JSONValue";
import type TerrorLinkServer from "../TerrorLinkServer";
import SteamAuthentication from "../authentication/SteamAuthentication";
import type { GameStateBody } from "../../types/GameStateBody";

function encodeJWT(payload: JSONValue) {
	return jwt.encode(payload, env.JWT_SECRET as string);
}

function decodeJWT(token: string) {
	try {
		return jwt.decode(token, env.JWT_SECRET as string);
	} catch (error) {
		return false;
	}
}

export default class WebServer extends EventEmitter {
	port: number;
	httpUrl: string;
	steamAuthentication: SteamAuthentication;
	constructor(port: number) {
		super();
		this.port = port;

		this.httpUrl = buildUrl(
			"http",
			this.port,
			env.NETWORK_SSL === "true" || env.NETWORK_SSL === "1",
			env.NETWORK_HOST,
			env.NETWORK_PROXY === "true" || env.NETWORK_PROXY === "1",
		);

		this.steamAuthentication = new SteamAuthentication(
			this.httpUrl,
			env.STEAM_TOKEN as string,
			`${this.httpUrl}/authenticate/steam/return`,
		);

		new Elysia()
			.onError((error) => {
				if (error.code === "NOT_FOUND") return;
				console.error(error);
			})
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
				this.emit("gamestate_update", context.body as GameStateBody);
			})

			.ws("/api/socket", {
				open: (client) => {
					const steamToken = client.data.headers["x-steam-token"] as string;
					const steamData = decodeJWT(steamToken);
					if (!steamData) {
						console.warn("Unauthenticated client tried to connect");
						return client.close();
					}
					this.emit("client_connected", { client, steamData });
				},
				message: (client, message) => {
					this.emit("client_message", { client, message });
				},
				close: (client) => {
					this.emit("client_disconnected", { client });
				},
			})
			.listen(this.port, () =>
				console.log(`WebServer is running on ${this.httpUrl}`),
			);
	}
}
