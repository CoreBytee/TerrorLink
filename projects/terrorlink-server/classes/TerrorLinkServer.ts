import { MessageType, type MessageUpdatePositionsPayload } from "networking";
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

		setInterval(() => {
			const players = this.gameState.listPlayers();
			const clients = this.webServer
				.listClients()
				.filter((client) => players.find((p) => p.steam_id === client.user.id));

			clients.forEach((client) => {
				client.sendMessage<MessageUpdatePositionsPayload>(
					MessageType.UpdatePositions,
					{
						time: this.gameState.time,
						positions: players.map((player) => ({
							...player,
							peer_id:
								clients.find((client) => client.user.id === player.steam_id)
									?.peerId ?? "",
							me: client.user.id === player.steam_id,
						})),
					},
				);
			});
		}, 20);
	}
}
