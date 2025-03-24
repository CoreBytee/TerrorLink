import { readJsonSync, writeJSONSync } from "fs-extra";
import type { JSONPrimitive } from "jsonvalue";

export default class Datastore {
	file: string;
	data: Record<string, JSONPrimitive>;
	constructor(file: string) {
		this.file = file;
		this.data = this.read();
	}

	private read() {
		return readJsonSync(this.file);
	}

	private write() {
		writeJSONSync(this.file, this.data, {
			spaces: 2,
		});
	}

	get(key: string) {
		return this.data[key];
	}

	set(key: string, value: JSONPrimitive) {
		this.data[key] = value;
		this.write();
	}

	remove(key: string) {
		delete this.data[key];
		this.write();
	}

	clear() {
		this.data = {};
		this.write();
	}

	has(key: string) {
		return key in this.data;
	}

	getAll() {
		return this.data;
	}
}
