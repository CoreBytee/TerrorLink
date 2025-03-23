import crypto from "node:crypto";

export default class Encryption {
	key: Buffer | null = null;

	canEncrypt() {
		return !!this.key;
	}

	setKey(key: Buffer | null) {
		this.key = key;
	}

	getKey() {
		if (!this.key) throw new Error("Encryption key not set");
		return this.key;
	}

	generateKey() {
		this.key = crypto.randomBytes(32);
		return this.key;
	}

	encrypt(data: Buffer) {
		if (!this.canEncrypt()) throw new Error("Encryption key not set");
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv("aes-256-cbc", this.getKey(), iv);
		const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
		return Buffer.concat([iv, encrypted]);
	}

	decrypt(data: Buffer) {
		if (!this.canEncrypt()) throw new Error("Encryption key not set");
		const iv = data.subarray(0, 16);
		const encrypted = data.subarray(16);
		const decipher = crypto.createDecipheriv("aes-256-cbc", this.getKey(), iv);
		const decrypted = Buffer.concat([
			decipher.update(encrypted),
			decipher.final(),
		]);
		return decrypted;
	}
}
