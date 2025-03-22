import type { GameStateBody, GameStatePlayer } from "../types/GameStateBody";
import { EventEmitter } from "node:events";
import type TerrorLinkServer from "./TerrorLinkServer";

export default class GameState extends EventEmitter {
	terrorLink: TerrorLinkServer;
	players: Record<GameStatePlayer["sid"], GameStatePlayer>;
	constructor(terrorLink: TerrorLinkServer) {
		super();
		this.terrorLink = terrorLink;

		this.players = {};
	}

	update(body: GameStateBody) {
		const data = body.data;

		for (const player of data.players) {
			if (!this.players[player.sid]) {
				this.emit("player_joined", player);
			}

			this.players[player.sid] = player;
		}

		for (const player of Object.values(this.players)) {
			if (!data.players.find((p) => p.sid === player.sid)) {
				this.emit("player_left", player);
				delete this.players[player.sid];
			}
		}

		this.emit("update", data);
		// console.dir(data, { depth: null });
	}
}
