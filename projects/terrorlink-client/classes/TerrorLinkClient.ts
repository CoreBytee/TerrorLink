import Window from "window";

import { SteamAccount } from "./SteamAccount";
import NetworkClient from "./NetworkClient";
import InternalWebserver from "./InternalWebserver";
import { env } from "bun";
import buildUrl from "build-url";
import Microphone from "./devices/Microphone";
import { Speaker } from "./devices/Speaker";
import { UDPMessageType } from "networking";

export class TerrorLinkClient {
	/**
	 * The URL of the HTTP server.
	 */
	httpUrl: string;

	/**
	 * The URL of the Websocket server.
	 */
	wsUrl: string;

	steamAccount: SteamAccount;
	networking: NetworkClient;
	microphone: Microphone;
	internalWebserver: InternalWebserver;
	window: Window;
	speaker: Speaker;
	constructor(port: number) {
		this.httpUrl = buildUrl(
			"http",
			env.NETWORK_PORT as number | undefined,
			env.NETWORK_SSL === "true" || env.NETWORK_SSL === "1",
			env.NETWORK_HOST as string | undefined,
		);

		this.wsUrl = buildUrl(
			"ws",
			env.NETWORK_PORT as number | undefined,
			env.NETWORK_SSL === "true" || env.NETWORK_SSL === "1",
			env.NETWORK_HOST as string | undefined,
		);

		this.steamAccount = new SteamAccount(this);
		this.networking = new NetworkClient(this);
		this.microphone = new Microphone();
		this.speaker = new Speaker();
		this.internalWebserver = new InternalWebserver(this, port);
		this.window = new Window(this.internalWebserver.url);

		this.microphone.on("frame", (frame) => {
			try {
				const encrypted = this.networking.encryptData(frame);
				this.networking.sendUDPMessage(UDPMessageType.Voice, encrypted);
			} catch (error) {}
		});
	}
}
