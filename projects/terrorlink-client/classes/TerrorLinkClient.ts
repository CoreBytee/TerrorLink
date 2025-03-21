import Window from "window";

import { SteamAccount } from "./SteamAccount";
import InternalWebserver from "./InternalWebserver";
import { env } from "bun";
import buildUrl from "build-url";
import Microphone from "./devices/Microphone";
import { Speaker } from "./devices/Speaker";
import Networking from "./networking/Networking";

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
	networking: Networking;
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

		this.steamAccount = new SteamAccount();
		this.networking = new Networking(this);
		this.microphone = new Microphone();
		this.speaker = new Speaker();
		this.internalWebserver = new InternalWebserver(this, port);
		this.window = new Window(this.internalWebserver.url);

		this.steamAccount.on("link", () => {
			this.networking.connect();
		});

		this.steamAccount.on("unlink", () => {
			this.networking.disconnect();
		});

		if (this.steamAccount.isLinked) {
			this.networking.connect();
		}

		this.microphone.on("frame", (frame) => {
			try {
				if (!this.networking.connected) return;
				this.networking.sendVoice(frame);
			} catch (error) {
				console.log(error);
			}
		});

		this.networking.on("voice", (data) => {
			this.speaker.play(data);
		});
	}
}
