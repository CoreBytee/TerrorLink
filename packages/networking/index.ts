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
