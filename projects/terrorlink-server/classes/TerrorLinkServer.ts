import type { GameStateData } from "gamestate";
import GameState from "./GameState";
import WebServer from "./networking/WebServer";

export default class TerrorLinkServer {
	webServer: WebServer;
	gameState: GameState;
	constructor() {
		this.webServer = new WebServer()
		this.gameState = new GameState(this);

		this.webServer.on("gamestate_update", (data) => {
			this.gameState.update(data);
		});
	}
}
