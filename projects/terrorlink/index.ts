import getPort from "get-port";
import { env, serve } from "bun";
import indexPage from "./pages/index.html" with { type: "file" };
import returnPage from "./pages/return.html" with { type: "file" };
import yippieGIF from "./pages/yippie.gif" with { type: "file" };
import open from "open";
import { readJsonSync, writeJSONSync } from "fs-extra";
import jwt from "jwt-simple";
import { Window } from "./classes/Window";
import { Client } from "@xhayper/discord-rpc";
import { Webview } from "webview-bun";
import bytes from "bytes";

if (env.WEBVIEW_DATA) {
	const data = JSON.parse(env.WEBVIEW_DATA);
	const webview = new Webview();
	webview.title = data.title;
	webview.size = data.size;

	webview.navigate(data.url);
	webview.run();
	process.exit(0);
}

const BASE_URL =
	(env.WEBSERVER_URL as string) || "https://terrorlink.corebyte.me";
const PORT = await getPort();

console.log(`http://localhost:${PORT}`);
const window = new Window(`http://localhost:${PORT}`);
let discordRPC: Client | null;
let websocket: WebSocket | null;
let messageCount = 0; // Received message count
let bytesCount = 0; // Received data count in bytes

function decodeJWT(token: string) {
	try {
		return jwt.decode(token, "", true);
	} catch (error) {
		return false;
	}
}

function storeToken(token: string) {
	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
	const decodedToken = decodeJWT(token);
	if (!decodedToken) return;
	if (!decodedToken.type) return;
	data[decodedToken.type] = token;
	writeJSONSync("./terrorlink.data", data, { spaces: 2 });
	connect();
}

function removeToken(type: string) {
	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
	delete data[type];
	writeJSONSync("./terrorlink.data", data, { spaces: 2 });
	disconnect();
}

function retrieveToken(type: string) {
	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
	return data[type] ?? false;
}

async function disconnect() {
	console.log("Disconnecting...");
	websocket?.close();
	websocket = null;
	discordRPC?.destroy();
	discordRPC = null;
}

async function connect() {
	disconnect();
	const discordToken = retrieveToken("discord");
	const steamToken = retrieveToken("steam");
	if (!discordToken || !steamToken) {
		console.log("Not connecting as not all tokens are stored");
		return;
	}
	console.log("Connecting to websocket...");

	discordRPC = new Client({
		clientId: "1342884301196496998",
		// transport: { type: "websocket" },
	});

	discordRPC.on("ready", () => {
		console.log("RPC ready...");
	});

	discordRPC.on("disconnected", () => {
		console.log("RPC disconnected...");
		reconnect();
	});

	await discordRPC.connect();
	await discordRPC.authenticate(decodeJWT(discordToken).accessToken);

	websocket = new WebSocket(`${env.WEBSOCKET_URL}/api/socket`, {
		headers: {
			"x-discord-token": discordToken,
			"x-steam-token": steamToken,
		},
	} as unknown as string[]);

	websocket.addEventListener("open", () => {
		console.log("Websocket connected...");
	});

	websocket.addEventListener("close", () => {
		console.log("Websocket disconnected...");
		reconnect();
	});

	websocket.addEventListener("message", (event) => {
		messageCount++;
		bytesCount += event.data.length;
	});

	console.log("Connected");
}

async function reconnect() {
	await disconnect();
	await connect();
}

connect();

serve({
	development: true,
	port: PORT,
	routes: {
		"/": () => {
			return new Response(Bun.file(indexPage));
		},

		"/return": async (request) => {
			const url = new URL(request.url);
			const token = url.searchParams.get("token");
			if (token) storeToken(token);
			return Response.redirect("/return/done");
		},
		"/return/done": () => {
			return new Response(Bun.file(returnPage));
		},
		"/return/yippie.gif": () => {
			return new Response(Bun.file(yippieGIF));
		},

		"/api/login/discord": {
			async POST() {
				open(`${BASE_URL}/authenticate/discord?p=${PORT}`);
				return new Response("");
			},
		},
		"/api/logout/discord": {
			async POST() {
				removeToken("discord");
				return new Response("");
			},
		},

		"/api/login/steam": {
			async POST() {
				open(`${BASE_URL}/authenticate/steam?p=${PORT}`);
				return new Response("");
			},
		},
		"/api/logout/steam": {
			async POST() {
				removeToken("steam");
				return new Response("");
			},
		},

		"/api/state": async (request) => {
			const discordToken = retrieveToken("discord");
			const steamToken = retrieveToken("steam");
			return Response.json({
				discord: discordToken ? decodeJWT(discordToken) : false,
				steam: steamToken ? decodeJWT(steamToken) : false,
				discordRPC: !!discordRPC,
				websocket: !!websocket,
				messageCount,
				bytesCount: bytes(bytesCount),
			});
		},
	},
});
