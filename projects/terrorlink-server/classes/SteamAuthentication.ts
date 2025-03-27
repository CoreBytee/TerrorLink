import SteamSignIn from "steam-signin";

export type SteamUserData = {
	id: string;
	displayName: string;
	avatarUrl: string
}

class SteamUser {
	id: string;
	displayName: string;
	avatarUrl: string;
	constructor(data: Record<string, string>) {
		this.id = data.steamid;
		this.displayName = data.personaname;
		this.avatarUrl = data.avatarfull;
	}

	toJSON() {
		return {
			id: this.id,
			displayName: this.displayName,
			avatarUrl: this.avatarUrl,
		};
	}
}

export default class SteamAuthentication {
	realm: string;
	token: string;
	redirectUrl: string;
	private steam: SteamSignIn;
	constructor(realm: string, token: string, redirectUrl: string) {
		this.realm = realm;
		this.token = token;
		this.redirectUrl = redirectUrl;

		this.steam = new SteamSignIn(this.realm);
	}

	/**
	 * Get the authorization URL
	 * @returns Authorization URL
	 */
	getAuthorizationURL() {
		return this.steam.getUrl(this.redirectUrl);
	}

	/**
	 * Verify the login
	 * @param url URL
	 * @returns Steam User
	 */
	async resolveUrl(url: string) {
		try {
			const steamId = await this.steam.verifyLogin(url);
			const data = await this.getUserData(steamId.getSteamID64());
			return new SteamUser(data);
		} catch (error) {
			return false
		}
	}

	private async getUserData(steamId: string) {
		const resposne = await fetch(
			`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.token}&steamids=${steamId}`,
		);
		const data = await resposne.json();
		const user = data.response.players[0];

		return user;
	}
}
