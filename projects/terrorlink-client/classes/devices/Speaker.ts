import { EventEmitter } from "node:events";

export class Speaker extends EventEmitter {
	constructor(deviceId?: string) {
		super();
	}

	async listDevices() {
		return [];
	}

	async getDevice() {
		return null;
	}

	async setDevice(deviceId: string) {
		return;
	}
}
