import { env } from "bun";
import Elysia from "elysia";
import SteamAuthentication from "./classes/SteamAuthentication";
import jwt from "jwt-simple";
import type { ElysiaWS } from "elysia/ws";
import type { GameStateBody } from "./types/GameStateBody";
import TerrorLinkServer from "./classes/TerrorLinkServer";

console.log("Hello via Bun!");
const port = Number.parseInt(env.NETWORK_PORT as string);

new TerrorLinkServer(port);

// const steamAuthentication = new SteamAuthentication(
// 	BASE_URL,
// 	env.STEAM_TOKEN as string,
// 	`${BASE_URL}/authenticate/steam/return`,
// );

// // biome-ignore lint/suspicious/noExplicitAny: <shut up>
// function encodeJWT(payload: Record<string, any>) {
// 	return jwt.encode(payload, env.JWT_SECRET as string);
// }

// function decodeJWT(token: string) {
// 	try {
// 		return jwt.decode(token, env.JWT_SECRET as string);
// 	} catch (error) {
// 		return false;
// 	}
// }

// function clamp(value: number, min: number, max: number) {
// 	return Math.min(Math.max(value, min), max);
// }

// const clients: {
// 	[key: string]: {
// 		ws: ElysiaWS;
// 		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// 		send: (data: any) => void;
// 		steamToken: string;
// 		discordToken: string;
// 		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// 		steamData: any;
// 		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// 		discordData: any;
// 	};
// } = {};

// async function handleStateUpdate(body: GameStateBody) {
// 	const data = body.data;
// 	const players = data.players;

// 	for (const client of Object.values(clients)) {
// 		const player = players.find((player) => player.sid === client.steamData.id);
// 		if (!player) continue;
// 		const otherPlayers = players.filter((p) => p.sid !== player.sid);

// 		for (const otherPlayer of otherPlayers) {
// 			const distance = Math.sqrt(
// 				(player.position.x - otherPlayer.position.x) ** 2 +
// 					(player.position.y - otherPlayer.position.y) ** 2 +
// 					(player.position.z - otherPlayer.position.z) ** 2,
// 			);
// 			const minDistance = 200;
// 			const maxDistance = 800;
// 			console.log(distance);
// 			const volume = clamp(
// 				100 - ((distance - minDistance) / (maxDistance - minDistance)) * 100,
// 				0,
// 				100,
// 			);
// 			client.send({
// 				type: "voice_settings",
// 				time: body.time,
// 				for: "1073933178361884702",
// 				volume,
// 				left: 0,
// 				right: 1,
// 			});
// 		}

// 		console.log(player.name);
// 	}
// }

// new Elysia()
// 	.onError((error) => console.error(error))
// 	.get("/", (context) => {
// 		return "Hello World!";
// 	})

// 	.get("/authenticate/steam", (context) => {
// 		context.cookie.port.value = Number.parseInt(context.query.p).toString();
// 		return context.redirect(steamAuthentication.getAuthorizationURL());
// 	})
// 	.get("/authenticate/steam/return", async (context) => {
// 		const steamUser = await steamAuthentication.resolveUrl(context.request.url);
// 		console.log(steamUser);
// 		if (!steamUser) return;
// 		const jwt = encodeJWT({
// 			...steamUser?.toJSON(),
// 			type: "steam",
// 		});

// 		return context.redirect(
// 			`http://localhost:${context.cookie.port.value}/return?token=${jwt}`,
// 		);
// 	})

// 	.post("/api/gamestate", (context) => {
// 		handleStateUpdate(context.body as GameStateBody);
// 		// console.dir(context.body, { depth: null });
// 	})

// 	.ws("/api/socket", {
// 		open(ws) {
// 			const steamToken = ws.data.headers["x-steam-token"] as string;
// 			const discordToken = ws.data.headers["x-discord-token"] as string;
// 			const steamData = decodeJWT(steamToken);
// 			const discordData = decodeJWT(discordToken);
// 			if (!steamData || !discordData) return ws.close();

// 			clients[ws.id] = {
// 				ws,
// 				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// 				send: (data: any) => {
// 					ws.sendText(JSON.stringify(data));
// 				},
// 				steamToken,
// 				discordToken,
// 				steamData,
// 				discordData,
// 			};
// 			console.log(steamData, discordData);
// 		},
// 		close(ws) {
// 			delete clients[ws.id];
// 		},
// 	})
// 	.listen(PORT, () => console.log(`Server is running on ${BASE_URL}`));
