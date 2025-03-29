import type { GameStatePlayer } from "gamestate";
import type { JSONValue } from "jsonvalue";

export enum MessageType {
	/**
	 * Sent when a client connects to let it know what peers are available.
	 */
	ActivePeers = "activePeers",

	/**
	 * Sent when the client should connect to a new peer.
	 */
	ConnectPeer = "connectPeer",

	/**
	 * Sent when the client should disconnect from a peer.
	 */
	DisconnectPeer = "disconnectPeer",

	/**
	 * Sent when the client should update the audio positions.
	 */
	UpdatePositions = "updatePositions",
}

export type Message<Payload = JSONValue> = {
	type: MessageType;
	payload: Payload;
};

export type MessageActivePeersPayload = {
	peers: string[];
};

export type MessageConnectPeerPayload = {
	peerId: string;
};

export type MessageDisconnectPeerPayload = {
	peerId: string;
};

interface GameStatePlayerWithPeerId extends GameStatePlayer {
	me: boolean;
	peer_id: string | undefined;
}

export type MessageUpdatePositionsPayload = {
	time: number;
	serverTime: number;
	serverPing: number;
	positions: GameStatePlayerWithPeerId[];
};
