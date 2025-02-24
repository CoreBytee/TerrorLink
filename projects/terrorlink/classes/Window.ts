import { type Size, SizeHint } from "webview-bun";
import cluster, { type Worker } from "node:cluster";

export class Window {
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
	}

	close() {
		this.worker?.kill();
	}

	reload() {
		this.close();
		this.load();
	}
}
