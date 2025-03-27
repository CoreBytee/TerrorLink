import type { JSONValue } from "jsonvalue";

export enum MessageType {
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