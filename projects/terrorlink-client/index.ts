import { env } from "bun";
import getPort from "get-port";
import Window from "window";
import { TerrorLinkClient } from "./classes/TerrorLinkClient";

try {
	const port =
		Number.parseInt(env.INTERNAL_WEBSERVER_PORT as string) || (await getPort());

	Window.check();
	new TerrorLinkClient(port);
} catch (error) {
	console.error(error);
	while (true) {
		Bun.sleepSync(1000);
	}
}
