import GameState from "./GameState";
import NetworkManager from "./networking/NetworkManager";

export default class TerrorLinkServer {
	networkManager: NetworkManager;
	gameState: GameState;
	constructor(port: number) {
		this.networkManager = new NetworkManager(port);
		this.gameState = new GameState(this);

		this.networkManager.on("gamestate_update", (data) => {
			this.gameState.update(data);
		});
	}
}
