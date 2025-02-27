import { type Size, SizeHint, Webview } from "webview-bun";
import cluster, { type Worker } from "node:cluster";
import { env } from "bun";

export class Window {
	static check() {
		if (!env.WEBVIEW_DATA) return;

		const data = JSON.parse(env.WEBVIEW_DATA);
		const webview = new Webview();
		webview.title = data.title;
		webview.size = data.size;

		webview.navigate(data.url);
		webview.run();
		process.exit(0);
	}

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
		this.worker = cluster.fork({
			WEBVIEW_DATA: JSON.stringify({
				url: this.url,
				size: this.size,
				title: "TerrorLink",
			}),
		});

		this.worker.on("exit", () => {
			process.exit(0);
		});
	}

	close() {
		this.worker?.kill();
	}

	reload() {
		this.close();
		this.load();
	}
}
