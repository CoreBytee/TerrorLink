import { serve } from "bun";
import type { TerrorLinkClient } from "./TerrorLinkClient";

import indexPage from "../pages/index.html" with { type: "file" };
import returnPage from "../pages/return.html" with { type: "file" };
import yippieGIF from "../pages/yippie.gif" with { type: "file" };
import open from "open";

export default class InternalWebserver {
	terrorLink: TerrorLinkClient;
	port: number;
	constructor(terrorLink: TerrorLinkClient, port: number) {
		this.terrorLink = terrorLink;
		this.port = port;

		const steamAccount = this.terrorLink.steamAccount;

		console.log(`Internal webserver running on http://localhost:${this.port}`);

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
					steamAccount.setToken(token);
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
						open(
							`${this.terrorLink.httpUrl}/authenticate/steam?p=${this.port}`,
						);
						return new Response("");
					},
				},
				"/api/logout/steam": {
					POST: async () => {
						steamAccount.removeToken();
						return new Response("");
					},
				},

				"/api/state": async (request) => {
					return Response.json({
						account: {
							steam: steamAccount.data,
						},
						microphone: {
							frequencyData:
								await this.terrorLink.microphone.getFrequencyData(),
						},
					});
				},
			},
		});
	}

	get url() {
		return `http://localhost:${this.port}`;
	}
}
