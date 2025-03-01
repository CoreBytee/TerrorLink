import type { GameStateBody } from "../types/GameStateBody";
import type TerrorLinkServer from "./TerrorLinkServer";

export default class GameState {
	terrorLink: TerrorLinkServer;
	constructor(terrorLink: TerrorLinkServer) {
		this.terrorLink = terrorLink;
	}

	update(body: GameStateBody) {
		// console.dir(body, { depth: null });
	}
}
