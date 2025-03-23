import { describe, expect, it } from "bun:test";

import { buildUDPMessage, parseUDPMessage, UDPMessageType } from "./index";
import { Buffer } from "node:buffer";

describe("UDP Message Utilities", () => {
	describe("buildUDPMessage", () => {
		it("should build a valid UDP message", () => {
			const type = UDPMessageType.Voice;
			const data = Buffer.from("test data");
			const message = buildUDPMessage(type, data);

			expect(message).toBeInstanceOf(Buffer);
			expect(message.byteLength).toBe(1 + 8 + data.byteLength);

			const hash = message.readBigUInt64BE(0);
			const currentHash = Bun.hash(
				Buffer.concat([Buffer.from([type]), data]),
			) as bigint;
			expect(hash).toBe(currentHash);

			const messageType = message.readUInt8(8);
			expect(messageType).toBe(type);

			const messageData = message.subarray(9);
			expect(messageData.equals(data)).toBe(true);
		});
	});

	describe("parseUDPMessage", () => {
		it("should parse a valid UDP message", () => {
			const type = UDPMessageType.Voice;
			const data = Buffer.from("test data");
			const message = buildUDPMessage(type, data);

			const parsedMessage = parseUDPMessage(message);
			expect(parsedMessage).not.toBeNull();
			expect(parsedMessage?.type).toBe(type);
			expect(parsedMessage?.data.equals(data)).toBe(true);
		});

		it("should return null for a message with an invalid hash", () => {
			const type = UDPMessageType.Voice;
			const data = Buffer.from("test data");
			const message = buildUDPMessage(type, data);

			// Corrupt the hash
			message.writeBigUInt64BE(BigInt(0), 0);

			const parsedMessage = parseUDPMessage(message);
			expect(parsedMessage).toBeNull();
		});

		it("should return null for a message with insufficient length", () => {
			const invalidMessage = Buffer.alloc(8); // Less than the minimum required length
			const parsedMessage = parseUDPMessage(invalidMessage);
			expect(parsedMessage).toBeNull();
		});
	});
});
