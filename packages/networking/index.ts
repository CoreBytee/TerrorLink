import type { JSONValue } from "jsonvalue";

export enum WSMessageType {
	/**
	 * Send when a client connects.
	 * Contains data the client can use to connect to the udp socket.
	 */
	Hello = 0x1,

	/**
	 * Sent by the client to let the server know what udp ip and port it is using.
	 */
	Identity = 0x2,

	/**
	 * Sent by the server after the client sends its identity.
	 * Signals that the client is ready to send and receive udp messages.
	 * Contains the encryption key for the udp messages.
	 */
	Ready = 0x3,
}

export enum UDPMessageType {
	/**
	 * Send by the client when it connect.
	 * Signals to the server that the client wants to know its ip and port.
	 */
	Identify = 0x1,

	/**
	 * Send by the server in response to the Identify message.
	 * Contains the server's ip and port.
	 */
	Identity = 0x2,

	/**
	 * Sent by the client and server
	 * Contains a voice packet
	 */
	Voice = 0x3,
}

export type WSMessage<Data = JSONValue> = {
	type: WSMessageType;
	data: Data;
};

export type UDPMessage<ServerSide = false> = {
	type: UDPMessageType;
	data: Buffer;
	address?: ServerSide extends true ? string : never;
	port?: ServerSide extends true ? number : never;
};

export function buildUDPMessage(type: UDPMessageType, data: Buffer) {
	const message = Buffer.alloc(1 + 8 + data.byteLength);

	// write hash
	const body = Buffer.concat([Buffer.from([type]), data]);
	const hash = Bun.hash(body) as bigint;
	message.writeBigUInt64BE(hash, 0);

	// write type
	message.writeUInt8(type, 8);

	// write data
	data.copy(message, 9);
	return message;
}

export function parseUDPMessage(message: Buffer): UDPMessage | null {
	if (message.byteLength < 9) return null;
	const hash = message.readBigUInt64BE(0);
	const currentHash = Bun.hash(message.subarray(8));
	const type = message.readUInt8(8);
	const data = message.subarray(9);

	if (hash !== currentHash) return null;
	return {
		type,
		data,
	};
}
