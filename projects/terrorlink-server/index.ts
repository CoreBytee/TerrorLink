import { env } from "bun";
import Elysia from "elysia";
import DiscordAuthentication from "./classes/DiscordAuthentication";
import SteamAuthentication from "./classes/SteamAuthentication";

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
	["identify"],
);

new Elysia()
	.get("/authenticate/steam", (context) => {
		return context.redirect(steamAuthentication.getAuthorizationURL());
	})
	.get("/authenticate/steam/return", async (context) => {
		const steamUser = await steamAuthentication.resolveUrl(context.request.url);
		console.log(steamUser);
	})
	.get("/authenticate/discord", (context) => {
		return context.redirect(discordAuthentication.getAuthorizationURL());
	})
	.get("/authenticate/discord/return", async (context) => {
		const discordUser = await discordAuthentication.resolveUrl(
			context.request.url,
		);
		console.log(discordUser);
	})
	.get("/", (context) => {
		return "Hello World!";
	})
	.post("/api/gamestate", (context) => {
		console.dir(context.body, { depth: null });
	})
	.listen(PORT, () => console.log(`Server is running on ${BASE_URL}`));
