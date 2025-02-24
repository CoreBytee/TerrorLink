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
const rpc = new Client({
	clientId: "1342884301196496998",
	// transport: { type: "websocket" },
});
await rpc.connect();
console.log(retrieveToken("discord"));
await rpc.authenticate(decodeJWT(retrieveToken("discord")).accessToken);

new Window(`http://localhost:${PORT}`);

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
}

function removeToken(type: string) {
	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
	delete data[type];
	writeJSONSync("./terrorlink.data", data, { spaces: 2 });
}

function retrieveToken(type: string) {
	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
	return data[type] ?? false;
}

const websocket = new WebSocket(`${env.WEBSOCKET_URL}/api/socket`, {
	headers: {
		"x-discord-token": retrieveToken("discord"),
		"x-steam-token": retrieveToken("steam"),
	},
} as unknown as string[]);

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
			});
		},
	},
});
