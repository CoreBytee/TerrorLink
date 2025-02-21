import { env } from "bun";
import Elysia from "elysia";
import { existsSync, mkdirSync, rmdirSync, writeFileSync } from "node:fs";

console.log("Hello via Bun!");
const port = Number.parseInt(env.WEBSERVER_PORT as string);

const messagesDirectory = "./messages";

if (existsSync(messagesDirectory)) {
	rmdirSync(messagesDirectory, { recursive: true });
}

mkdirSync(messagesDirectory);
let messageCount = -1;

new Elysia()
	.post("/api/gsi", (context) => {
		console.log(context.body);
		messageCount++;
		writeFileSync(
			`${messagesDirectory}/message-${messageCount}.json`,
			JSON.stringify(context.body, null, 2),
		);
	})
	.listen(port, () => console.log(`Server is running on ${port}`));
