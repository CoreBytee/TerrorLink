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
		this.gameState.on("update", (data: GameStateData) => {
			const clients = this.networkManager.listClients();
			const connectedClients = clients.filter((client) => {
				return data.players.find(
					(player) => player.steam_id === client.steamId,
				);
			});

			connectedClients.forEach((client) => {
				client.sendWSMessage(WSMessageType.GameState, data);
			});
		});
	}
}
