import { env, serve } from "bun";
import { Window } from "./Window";

import indexPage from "../pages/index.html" with { type: "file" };
import returnPage from "../pages/return.html" with { type: "file" };
import yippieGIF from "../pages/yippie.gif" with { type: "file" };
import { SteamAccount } from "./SteamAccount";
import bytes from "bytes";
import open from "open";

export class TerrorLink {
	remoteUrl: string;
	port: number;
	window: Window;
	steamAccount: SteamAccount;
	constructor(port: number) {
		console.log(`http://localhost:${port}`);
		this.remoteUrl =
			(env.WEBSERVER_URL as string) || "https://terrorlink.corebyte.me";
		this.port = port;
		this.window = new Window(`http://localhost:${this.port}`);
		this.steamAccount = new SteamAccount(this);

		serve({
			development: true,
			port: this.port,
			routes: {
				"/": () => {
					return new Response(Bun.file(indexPage));
				},

				"/return": async (request) => {
					const url = new URL(request.url);
					const token = url.searchParams.get("token") ?? "";
					this.steamAccount.setToken(token);
					return Response.redirect("/return/done");
				},
				"/return/done": () => {
					return new Response(Bun.file(returnPage));
				},
				"/return/yippie.gif": () => {
					return new Response(Bun.file(yippieGIF));
				},

				"/api/login/steam": {
					POST: async () => {
						open(`${this.remoteUrl}/authenticate/steam?p=${this.port}`);
						return new Response("");
					},
				},
				"/api/logout/steam": {
					POST: async () => {
						this.steamAccount.removeToken();
						return new Response("");
					},
				},

				"/api/state": async (request) => {
					return Response.json({
						steamAccount: this.steamAccount.data,
						websocket: {
							isConnected: false,
							ping: 0,
							messageCount: 0,
							bytesCount: bytes(0),
						},
					});
				},
			},
		});
	}
}
