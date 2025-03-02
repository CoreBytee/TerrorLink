import getPort from "get-port";
import { env, serve } from "bun";
import indexPage from "./pages/index.html" with { type: "file" };
import returnPage from "./pages/return.html" with { type: "file" };
import yippieGIF from "./pages/yippie.gif" with { type: "file" };
import open from "open";
import { readJsonSync, writeJSONSync } from "fs-extra";
import jwt from "jwt-simple";
import Window from "window";
import { Webview } from "webview-bun";
import bytes from "bytes";
import { TerrorLinkClient } from "./classes/TerrorLinkClient";

const port =
	Number.parseInt(env.INTERNAL_WEBSERVER_PORT as string) ?? (await getPort());

Window.check();
new TerrorLinkClient(port);

// const window = new Window(`http://localhost:${PORT}`);
// let discordRPC: Client | null;
// let websocket: WebSocket | null;
// let messageCount = 0; // Received message count
// let bytesCount = 0; // Received data count in bytes
// let ping = -1;
// let volume = 100;

// function decodeJWT(token: string) {
// 	try {
// 		return jwt.decode(token, "", true);
// 	} catch (error) {
// 		return false;
// 	}
// }

// function storeToken(token: string) {
// 	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
// 	const decodedToken = decodeJWT(token);
// 	if (!decodedToken) return;
// 	if (!decodedToken.type) return;
// 	data[decodedToken.type] = token;
// 	writeJSONSync("./terrorlink.data", data, { spaces: 2 });
// 	connect();
// }

// function removeToken(type: string) {
// 	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
// 	delete data[type];
// 	writeJSONSync("./terrorlink.data", data, { spaces: 2 });
// 	disconnect();
// }

// function retrieveToken(type: string) {
// 	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
// 	return data[type] ?? false;
// }

// async function disconnect() {
// 	console.log("Disconnecting...");
// 	websocket?.close();
// 	websocket = null;
// 	discordRPC?.destroy();
// 	discordRPC = null;
// }

// async function connect() {
// 	disconnect();
// 	const discordToken = retrieveToken("discord");
// 	const steamToken = retrieveToken("steam");
// 	if (!discordToken || !steamToken) {
// 		console.log("Not connecting as not all tokens are stored");
// 		return;
// 	}
// 	console.log("Connecting to websocket...");

// 	websocket = new WebSocket(`${env.WEBSOCKET_URL}/api/socket`, {
// 		headers: {
// 			"x-discord-token": discordToken,
// 			"x-steam-token": steamToken,
// 		},
// 	} as unknown as string[]);

// 	websocket.addEventListener("open", () => {
// 		console.log("Websocket connected...");
// 	});

// 	websocket.addEventListener("close", () => {
// 		console.log("Websocket disconnected...");
// 		reconnect();
// 	});

// 	websocket.addEventListener("message", (event) => {
// 		messageCount++;
// 		bytesCount += event.data.length;
// 	});

// 	websocket.addEventListener("message", async (event) => {
// 		const data = JSON.parse(event.data);
// 		ping = Date.now() - Date.parse(data.time);
// 		if (data.type === "voice_settings") {
// 			console.log(data);
// 			await discordRPC?.user?.setVoiceSettings({
// 				user_id: data.for,
// 				volume: (data.volume / 100) * volume,
// 				mute: false,
// 				pan: {
// 					left: data.left,
// 					right: data.right,
// 				},
// 			});
// 		}
// 	});

// 	console.log("Connected");
// }

// async function reconnect() {
// 	await disconnect();
// 	await Bun.sleep(1000);
// 	await connect();
// }

// connect();

// serve({
// 	development: true,
// 	port: PORT,
// 	routes: {
// 		"/": () => {
// 			return new Response(Bun.file(indexPage));
// 		},

// 		"/return": async (request) => {
// 			const url = new URL(request.url);
// 			const token = url.searchParams.get("token");
// 			if (token) storeToken(token);
// 			return Response.redirect("/return/done");
// 		},
// 		"/return/done": () => {
// 			return new Response(Bun.file(returnPage));
// 		},
// 		"/return/yippie.gif": () => {
// 			return new Response(Bun.file(yippieGIF));
// 		},

// 		"/api/login/discord": {
// 			async POST() {
// 				open(`${BASE_URL}/authenticate/discord?p=${PORT}`);
// 				return new Response("");
// 			},
// 		},
// 		"/api/logout/discord": {
// 			async POST() {
// 				removeToken("discord");
// 				return new Response("");
// 			},
// 		},

// 		"/api/login/steam": {
// 			async POST() {
// 				open(`${BASE_URL}/authenticate/steam?p=${PORT}`);
// 				return new Response("");
// 			},
// 		},
// 		"/api/logout/steam": {
// 			async POST() {
// 				removeToken("steam");
// 				return new Response("");
// 			},
// 		},

// 		"/api/state": async (request) => {
// 			const discordToken = retrieveToken("discord");
// 			const steamToken = retrieveToken("steam");

// 			return Response.json({
// 				discord: discordToken ? decodeJWT(discordToken) : false,
// 				steam: steamToken ? decodeJWT(steamToken) : false,
// 				discordRPC: !!discordRPC,
// 				websocket: !!websocket,
// 				messageCount,
// 				bytesCount: bytes(bytesCount),
// 				ping,
// 			});
// 		},

// 		"/api/volume": {
// 			async POST(request) {
// 				const data = await request.json();
// 				volume = data.volume;
// 				return new Response("");
// 			},
// 		},
// 	},
// });
