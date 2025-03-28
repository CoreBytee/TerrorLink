import GameState from "./GameState";
import WebServer from "./networking/WebServer";

export default class TerrorLinkServer {
	webServer: WebServer;
	gameState: GameState;
	constructor() {
		this.webServer = new WebServer();
		this.gameState = new GameState(this);

		this.webServer.on("gamestate", (data) => {
			this.gameState.update(data);
		});
	}
}
