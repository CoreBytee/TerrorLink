class DiscordUser {
	id: string;
	displayName: string;
	avatarUrl: string;
	tokenType: string;
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	scopes: string[];

	constructor(data: {
		id: string;
		displayName: string;
		avatar: string;
		tokenType: string;
		accessToken: string;
		refreshToken: string;
		expiresIn: number;
		scopes: string[];
	}) {
		this.id = data.id;
		this.displayName = data.displayName;
		this.avatarUrl = `https://cdn.discordapp.com/avatars/${this.id}/${data.avatar}.png`;

		this.tokenType = data.tokenType;
		this.accessToken = data.accessToken;
		this.refreshToken = data.refreshToken;
		this.expiresIn = data.expiresIn;
		this.scopes = data.scopes;
	}

	toJSON() {
		return {
			id: this.id,
			displayName: this.displayName,
			avatarUrl: this.avatarUrl,
			tokenType: this.tokenType,
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			expiresIn: this.expiresIn,
		};
	}
}

export default class DiscordAuthentication {
	clientId: string;
	clientSecret: string;
	redirectUrl: string;
	scopes: string[];
	constructor(
		clientId: string,
		clientSecret: string,
		redirectUrl: string,
		scopes: string[],
	) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.redirectUrl = redirectUrl;
		this.scopes = scopes;
	}

	getAuthorizationURL() {
		const query = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUrl,
			response_type: "code",
			scope: this.scopes.join(" "),
			prompt: "none",
		});

		return `https://discord.com/api/oauth2/authorize?${query.toString()}`;
	}

	async resolveUrl(url: string) {
		const code = new URL(url).searchParams.get("code");
		if (!code) return null;
		return this.resolveCode(code);
	}

	private async resolveCode(code: string) {
		const response = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: this.clientId,
				client_secret: this.clientSecret,
				code,
				grant_type: "authorization_code",
				redirect_uri: this.redirectUrl,
			}),
		});

		if (!response.ok) return null;

		const token = await response.json();
		const user = await this.getUserData(token.access_token);

		return new DiscordUser({
			id: user.id,
			displayName: user.global_name,
			avatar: user.avatar,
			tokenType: token.token_type,
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			expiresIn: token.expires_in,
			scopes: token.scope.split(" "),
		});
	}

	private async getUserData(token: string) {
		const response = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		return response.json();
	}
}
