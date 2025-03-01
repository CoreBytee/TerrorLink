import GameState from "./GameState";
import NetworkServer from "./NetworkServer";

export default class TerrorLinkServer {
	port: number;
	networking: NetworkServer;
	gameState: GameState;
	constructor(port: number) {
		this.port = port;
		this.networking = new NetworkServer(this, this.port);
		this.gameState = new GameState(this);
	}
}
