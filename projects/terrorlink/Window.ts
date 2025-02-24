import { type Size, SizeHint } from "webview-bun";
import WindowWorker from "./Worker" with { type: "file" };

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
