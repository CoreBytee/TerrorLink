class DiscordUser {
	id: string;
	displayName: string;
	avatarUrl: string;
	constructor(data: Record<string, string>) {
		this.id = data.id;
		this.displayName = data.global_name;
		this.avatarUrl = `https://cdn.discordapp.com/avatars/${this.id}/${data.avatar}.png`;
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

		return new DiscordUser(user);
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
