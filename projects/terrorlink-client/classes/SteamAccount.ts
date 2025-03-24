import { EventEmitter } from "node:events";
import { readJsonSync, writeJSONSync } from "fs-extra";
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
	onChange: (token: string | null) => void;
	data: SteamTokenData | null;
	constructor(token: string, onChange: (token: string | null) => void) {
		super();
		this.token = token;
		this.onChange = onChange;
		this.data = decodeJWT(this.token);
	}

	get isLinked() {
		return !!this.token;
	}

	setToken(token: string) {
		this.token = token;
		this.data = decodeJWT(token);
		if (!this.data) return;
		this.onChange(token);
		this.emit("link");
	}

	removeToken() {
		this.token = null;
		this.data = null;
		this.emit("unlink");
		this.onChange(null);
	}
}
