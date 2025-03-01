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
}

export type WSMessage = {
	type: WSMessageType;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	data: any;
};

export type UDPMessage = {
	type: UDPMessageType;
	data: Buffer;
};
