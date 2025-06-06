import type { GameStateBody, GameStatePlayer } from "gamestate";
import { EventEmitter } from "node:events";
import type TerrorLinkServer from "./TerrorLinkServer";

export default class GameState extends EventEmitter {
	terrorLink: TerrorLinkServer;
	players: Record<GameStatePlayer["steam_id"], GameStatePlayer>;
	time: number;
	constructor(terrorLink: TerrorLinkServer) {
		super();
		this.terrorLink = terrorLink;

		this.players = {};
		this.time = 0;
	}

	listPlayers() {
		return Object.values(this.players);
	}

	update(body: GameStateBody) {
		const data = body.data;

		this.time = new Date(body.time).getTime();

		for (const player of data.players) {
			if (!this.players[player.steam_id]) {
				this.emit("player_joined", player);
			}

			this.players[player.steam_id] = player;
		}

		for (const player of Object.values(this.players)) {
			if (!data.players.find((p) => p.steam_id === player.steam_id)) {
				this.emit("player_left", player);
				delete this.players[player.steam_id];
			}
		}

		this.emit("update", data);
		// console.dir(data, { depth: null });
	}
}
