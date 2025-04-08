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
						serverTime: Date.now(),
						serverPing: Date.now() - this.gameState.time,
						players: players.map((player) => {
							const thisClient = clients.find(
								(client) => client.user.id === player.steam_id,
							);
							return {
								...player,
								peer_id:
									thisClient?.peerId ??
									clients.find((c) => c !== client)?.peerId,
								avatar_url: thisClient?.user.avatarUrl,
								me: client.user.id === player.steam_id,
							};
						}),
					},
				);
			});
		}, 20);
	}
}
