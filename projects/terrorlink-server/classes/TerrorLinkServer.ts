import { WSMessageType } from "networking";
import type { GameStateData } from "gamestate";
import GameState from "./GameState";
import NetworkManager from "./networking/NetworkManager";
import type NetworkClient from "./networking/NetworkClient";

export default class TerrorLinkServer {
	networkManager: NetworkManager;
	gameState: GameState;
	constructor(port: number) {
		this.networkManager = new NetworkManager(port);
		this.gameState = new GameState(this);

		this.networkManager.on("gamestate_update", (data) => {
			this.gameState.update(data);
		});

		this.networkManager.on(
			"voice",
			({ client, data }: { client: NetworkClient; data: Buffer }) => {
				const gamePlayers = this.gameState.playersList;
				const gamePlayer = gamePlayers.find(
					(player) => player.steam_id === client.steamId,
				);
				if (!gamePlayer) return;

				gamePlayers.forEach((player) => {
					const client = this.networkManager.getClient(player.steam_id);
					if (!client) return;
					client.dispatchVoice(Number.parseInt(gamePlayer.user_id), data);
				});
			},
		);

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
