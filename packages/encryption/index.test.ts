import { beforeEach, describe, expect, it } from "bun:test";

import Encryption from "./index";
import crypto from "node:crypto";

describe("Encryption", () => {
	let encryption: Encryption;

	beforeEach(() => {
		encryption = new Encryption();
	});

	it("should initialize with a null key", () => {
		expect(encryption.key).toBeNull();
	});

	it("should return false for canEncrypt() when key is not set", () => {
		expect(encryption.canEncrypt()).toBe(false);
	});

	it("should set and get the encryption key", () => {
		const key = crypto.randomBytes(32);
		encryption.setKey(key);
		expect(encryption.getKey()).toBe(key);
	});

	it("should throw an error when getKey() is called without setting a key", () => {
		expect(() => encryption.getKey()).toThrow("Encryption key not set");
	});

	it("should generate a 32-byte encryption key", () => {
		const key = encryption.generateKey();
		expect(key).toBeInstanceOf(Buffer);
		expect(key.length).toBe(32);
		expect(encryption.getKey()).toBe(key);
	});

	it("should encrypt and decrypt data correctly", () => {
		const key = crypto.randomBytes(32);
		encryption.setKey(key);

		const data = Buffer.from("Hello, World!");
		const encrypted = encryption.encrypt(data);
		expect(encrypted).not.toEqual(data);

		const decrypted = encryption.decrypt(Buffer.concat([encrypted]));
		expect(decrypted.toString()).toBe(data.toString());
	});

	it("should throw an error when encrypting without a key", () => {
		const data = Buffer.from("Hello, World!");
		expect(() => encryption.encrypt(data)).toThrow("Encryption key not set");
	});

	it("should throw an error when decrypting without a key", () => {
		const data = Buffer.from("Hello, World!");
		expect(() => encryption.decrypt(data)).toThrow("Encryption key not set");
	});

	it("should throw an error when decrypting invalid data", () => {
		const key = crypto.randomBytes(32);
		encryption.setKey(key);

		const invalidData = Buffer.from("Invalid data");
		expect(() => encryption.decrypt(invalidData)).toThrow();
	});
});
