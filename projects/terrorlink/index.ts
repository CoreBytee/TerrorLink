import getPort from "get-port";
import { env, serve } from "bun";
import indexPage from "./index.html";
import returnPage from "./return.html";
import open from "open";
import { readJsonSync, writeJSONSync } from "fs-extra";
import jwt from "jwt-simple";
import { Window } from "./Classes/Window";

const BASE_URL =
	(env.WEBSERVER_URL as string) || "https://terrorlink.corebyte.me";
const PORT = await getPort();

console.log(`http://localhost:${PORT}`);
const window = new Window(`http://localhost:${PORT}`);

function decodeJWT(token: string) {
	return jwt.decode(token, "", true);
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

serve({
	development: true,
	port: PORT,
	routes: {
		"/": indexPage,

		"/return": async (request) => {
			const url = new URL(request.url);
			const token = url.searchParams.get("token");
			if (token) storeToken(token);
			return Response.redirect("/return/done");
		},
		"/return/done": returnPage,

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
