import Window from "window";

import { SteamAccount } from "./SteamAccount";
import NetworkClient from "./NetworkClient";
import InternalWebserver from "./InternalWebserver";
import { env } from "bun";
import buildUrl from "../util/buildUrl";

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
	internalWebserver: InternalWebserver;
	window: Window;
	constructor(port: number) {
		this.httpUrl = buildUrl(
			"http",
			env.NETWORK_PORT as number | undefined,
			env.NETWORK_SSL === "true",
			env.NETWORK_HOST as string | undefined,
		);

		this.wsUrl = buildUrl(
			"ws",
			env.NETWORK_PORT as number | undefined,
			env.NETWORK_SSL === "true",
			env.NETWORK_HOST as string | undefined,
		);

		this.steamAccount = new SteamAccount(this);
		this.networking = new NetworkClient(this);
		this.internalWebserver = new InternalWebserver(this, port);
		this.window = new Window(this.internalWebserver.url);
	}
}
