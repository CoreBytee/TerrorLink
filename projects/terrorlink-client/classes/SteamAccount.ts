import { EventEmitter } from "node:events";
import { readJsonSync, writeJSONSync } from "fs-extra";
import type { TerrorLinkClient } from "./TerrorLinkClient";
import jwt from "jwt-simple";

function decodeJWT(token: string | null) {
	if (!token) return null;
	try {
		return jwt.decode(token, "", true);
	} catch (error) {
		return null;
	}
}

type SteamTokenData = {
	id: string;
	displayName: string;
	avatarUrl: string;
};

export class SteamAccount extends EventEmitter {
	token: string | null;
	data: SteamTokenData | null;
	constructor() {
		super();
		this.token =
			readJsonSync("./terrorlink.data", { throws: false })?.steam ?? null;
		this.data = decodeJWT(this.token);
	}

	get isLinked() {
		return !!this.token;
	}

	setToken(token: string) {
		this.token = token;
		this.data = decodeJWT(token);
		if (!this.data) return;
		this.emit("link");
		const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
		data.steam = token;
		writeJSONSync("./terrorlink.data", data, { spaces: 2 });
	}

	removeToken() {
		this.token = null;
		this.data = null;
		this.emit("unlink");
		const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
		data.steam = undefined;
		writeJSONSync("./terrorlink.data", data, { spaces: 2 });
	}
}
