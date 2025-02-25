import { readJsonSync, writeJSONSync } from "fs-extra";
import type { TerrorLink } from "./TerrorLink";
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

export class SteamAccount {
	terrorLink: TerrorLink;
	token: string | null;
	data: SteamTokenData | null;
	constructor(terrorLink: TerrorLink) {
		this.terrorLink = terrorLink;
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
		const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
		data.steam = token;
		writeJSONSync("./terrorlink.data", data, { spaces: 2 });
	}

	removeToken() {
		this.token = null;
		this.data = null;
		const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
		data.steam = undefined;
		writeJSONSync("./terrorlink.data", data, { spaces: 2 });
	}
}
