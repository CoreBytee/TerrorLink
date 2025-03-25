import Window from "window";

import { SteamAccount } from "./SteamAccount";
import InternalWebserver from "./InternalWebserver";
import { env } from "bun";
import buildUrl from "build-url";
import Microphone from "./devices/Microphone";
import { Speaker } from "./devices/Speaker";
import Networking from "./networking/Networking";
import type { GameStateData } from "gamestate";
import Datastore from "./Datastore";
import { OpusEncoder } from "@discordjs/opus";

export class TerrorLinkClient {
	/**
	 * The URL of the HTTP server.
	 */
	httpUrl: string;

	/**
	 * The URL of the Websocket server.
	 */
	wsUrl: string;

	opus: OpusEncoder;
	datastore: Datastore;
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

		this.opus = new OpusEncoder(48000, 1);
		this.datastore = new Datastore("terrorlink.data");
		this.steamAccount = new SteamAccount(
			this.datastore.get("steam_token") as string,
			(token) => {
				this.datastore.set("steam_token", token);
			},
		);
		this.networking = new Networking(this);
		this.microphone = new Microphone(
			this.datastore.get("microphone") as string,
		);
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
				// const encoded = this.opus.encode(frame);
				const encoded = frame;
				this.speaker.createChannel("local");
				this.speaker.play("local", encoded);
				this.networking.sendVoice(encoded);
			} catch (error) {
				console.log(error);
			}
		});

		this.microphone.on("device_change", (deviceId: number) => {
			this.datastore.set("microphone", deviceId);
		});

		this.networking.on("voice", async (voice) => {
			const stringUserId = voice.userId.toString();
			// const channelExists = await this.speaker.existsChannel(stringUserId);
			// if (!channelExists) return;

			// const decoded = this.opus.decode(voice.data);
			const decoded = voice.data;
			this.speaker.createChannel(voice.userId);
			// this.speaker.play(voice.userId, decoded);
		});

		this.networking.on("gamestate", (gamestate: GameStateData) => {
			// console.log(gamestate);
			const players = gamestate.players;

			players.forEach((player) => {
				this.speaker.createChannel(player.user_id);
				const botPlayer = players.find((player) => player.is_bot)!;
				this.speaker.setChannelPosition(
					player.user_id,
					botPlayer.position,
					botPlayer.angle,
				);
			});

			const thisPlayer = players.find(
				(player) => player.steam_id === this.steamAccount.data?.id,
			);

			if (!thisPlayer) {
				console.error("TerrorLinkClient: Player not found");
				return;
			}

			this.speaker.setPosition(thisPlayer.position, thisPlayer.angle);
		});
	}
}
