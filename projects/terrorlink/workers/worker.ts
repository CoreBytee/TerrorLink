import { SizeHint, Webview } from "webview-bun";

const webview = new Webview();
webview.title = "TerrorLink";

self.addEventListener("message", (event) => {
	console.log(event);
	webview.size = event.data.size;
	webview.navigate(event.data.url);
	webview.run();
	process.exit(0);
});

export default "Hello from Worker!";
