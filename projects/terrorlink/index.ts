import getPort from "get-port";
import WindowWorker from "./Worker" with { type: "file" };
import { env, serve } from "bun";
import indexPage from "./index.html";
import returnPage from "./return.html";
import open from "open";
import { readJsonSync, writeJSONSync } from "fs-extra";
import jwt from "jwt-simple";
import { SizeHint, type Size } from "webview-bun";

const BASE_URL =
	(env.WEBSERVER_URL as string) || "https://terrorlink.corebyte.me";
const PORT = await getPort();

console.log(`http://localhost:${PORT}`);

class Window {
	url: string;
	size: Size;
	private worker: Worker | undefined;
	constructor(
		url: string,
		size: Size = { width: 400, height: 400, hint: SizeHint.FIXED },
	) {
		this.url = url;
		this.size = size;
		this.load();
	}

	private load() {
		this.worker = new Worker(WindowWorker);
		this.worker.postMessage({ url: this.url, size: this.size });
	}

	close() {
		this.worker?.terminate();
	}

	reload() {
		this.close();
		this.load();
	}
}

const window = new Window(`http://localhost:${PORT}`);

function storeToken(token: string) {
	const data = readJsonSync("./terrorlink.data", { throws: false }) ?? {};
	const decodedToken = jwt.decode(token, "", true);
	if (!decodedToken) return;
	if (!decodedToken.type) return;
	data[decodedToken.type] = token;
	writeJSONSync("./terrorlink.data", data, { spaces: 2 });
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
			window.reload();
			return Response.redirect("/return/done");
		},
		"/return/done": returnPage,
		"/login/discord": {
			async POST() {
				open(`${BASE_URL}/authenticate/discord?p=${PORT}`);
				return new Response("");
			},
		},
		"/login/steam": {
			async POST() {
				open(`${BASE_URL}/authenticate/steam?p=${PORT}`);
				return new Response("");
			},
		},
		"/state": async (request) => {
			return Response.json({});
		},
	},
});
