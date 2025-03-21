import { serve } from "bun";
import type { TerrorLinkClient } from "./TerrorLinkClient";

import indexPage from "../pages/index.html" with { type: "file" };
import returnPage from "../pages/return.html" with { type: "file" };
import yippieGIF from "../pages/yippie.gif" with { type: "file" };
import open from "open";
import bytes from "bytes";

export default class InternalWebserver {
	terrorLink: TerrorLinkClient;
	port: number;
	constructor(terrorLink: TerrorLinkClient, port: number) {
		this.terrorLink = terrorLink;
		this.port = port;

		const steamAccount = this.terrorLink.steamAccount;

		console.log(`Internal webserver running on ${this.url}`);

		serve({
			development: true,
			port: this.port,
			hostname: "localhost",
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
						console.log(
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
					const ws = this.terrorLink.networking.webSocket;
					const udp = this.terrorLink.networking.udpSocket;
					return Response.json({
						account: {
							steam: steamAccount.data,
						},
						microphone: {
							frequencyData:
								await this.terrorLink.microphone.getFrequencyData(),
						},
						debug: `WS (S/R): ${ws.sentMessages}/${bytes(ws.sentBytes)} ${ws.receivedMessages}/${bytes(ws.receivedBytes)} UDP (S/R/D): ${udp.sentMessages}/${bytes(udp.sentBytes)} ${udp.receivedMessages}/${bytes(udp.receivedBytes)} ${udp.droppedMessages}/${bytes(udp.droppedBytes)}`,
					});
				},

				"/api/devices": {
					GET: async () => {
						return Response.json({
							microphones: await this.terrorLink.microphone.listDevices(),
							speakers: await this.terrorLink.speaker.listDevices(),
						});
					},
					POST: async (request) => {
						const body = await request.json();
						const type = body.type;
						const deviceId = body.deviceId;
						type === "microphone"
							? await this.terrorLink.microphone.setDevice(deviceId)
							: await this.terrorLink.speaker.setDevice(deviceId);

						return new Response("", { status: 204 });
					},
				},

				"/api/devices/microphone": {
					GET: async () => {
						return Response.json({
							mute: await this.terrorLink.microphone.isMuted,
						});
					},
					POST: async (request) => {
						const state = await this.terrorLink.microphone.toggleMute();
						return Response.json({
							mute: state,
						});
					},
				},
			},
		});
	}

	get url() {
		return `http://localhost:${this.port}`;
	}
}
