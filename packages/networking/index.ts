import type { GameStatePlayer } from "gamestate";
import type { JSONValue } from "jsonvalue";

export enum MessageType {
	/**
	 * Sent when the client should update the audio positions.
	 */
	UpdatePositions = "updatePositions",
}

export type Message<Payload = JSONValue> = {
	type: MessageType;
	payload: Payload;
};

interface GameStatePlayerWithPeerId extends GameStatePlayer {
	me: boolean;
	avatar_url: string | undefined;
	peer_id: string | undefined;
}

export type MessageUpdatePositionsPayload = {
	time: number;
	serverTime: number;
	serverPing: number;
	players: GameStatePlayerWithPeerId[];
};
