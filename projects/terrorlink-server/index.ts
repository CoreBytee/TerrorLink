import { env } from "bun";
import Elysia from "elysia";
import DiscordAuthentication from "./classes/DiscordAuthentication";
import SteamAuthentication from "./classes/SteamAuthentication";
import jwt from "jwt-simple";

console.log("Hello via Bun!");
const BASE_URL = env.WEBSERVER_URL as string;
const PORT = Number.parseInt(env.WEBSERVER_PORT as string);

const steamAuthentication = new SteamAuthentication(
	BASE_URL,
	env.STEAM_TOKEN as string,
	`${BASE_URL}/authenticate/steam/return`,
);

const discordAuthentication = new DiscordAuthentication(
	env.DISCORD_CLIENT_ID as string,
	env.DISCORD_CLIENT_SECRET as string,
	`${BASE_URL}/authenticate/discord/return`,
	["identify", "rpc", "rpc.voice.write", "rpc.voice.read"],
);

// biome-ignore lint/suspicious/noExplicitAny: <shut up>
function encodeJWT(payload: Record<string, any>) {
	return jwt.encode(payload, env.JWT_SECRET as string);
}

new Elysia()
	.get("/authenticate/discord", (context) => {
		context.cookie.port.value = Number.parseInt(context.query.p).toString();
		return context.redirect(discordAuthentication.getAuthorizationURL());
	})
	.get("/authenticate/discord/return", async (context) => {
		const discordUser = await discordAuthentication.resolveUrl(
			context.request.url,
		);
		if (!discordUser) return;
		const jwt = encodeJWT({
			...discordUser?.toJSON(),
			type: "discord",
		});

		return context.redirect(
			`http://localhost:${context.cookie.port.value}/return?token=${jwt}`,
		);
	})

	.get("/authenticate/steam", (context) => {
		context.cookie.port.value = Number.parseInt(context.query.p).toString();
		return context.redirect(steamAuthentication.getAuthorizationURL());
	})
	.get("/authenticate/steam/return", async (context) => {
		const steamUser = await steamAuthentication.resolveUrl(context.request.url);
		console.log(steamUser);
		if (!steamUser) return;
		const jwt = encodeJWT({
			...steamUser?.toJSON(),
			type: "steam",
		});

		return context.redirect(
			`http://localhost:${context.cookie.port.value}/return?token=${jwt}`,
		);
	})

	.get("/", (context) => {
		return "Hello World!";
	})
	.post("/api/gamestate", (context) => {
		console.dir(context.body, { depth: null });
	})
	.listen(PORT, () => console.log(`Server is running on ${BASE_URL}`));
