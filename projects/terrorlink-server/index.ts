import { env } from "bun";
import Elysia from "elysia";
import { existsSync, mkdirSync, rmdirSync, writeFileSync } from "node:fs";

console.log("Hello via Bun!");
const port = Number.parseInt(env.WEBSERVER_PORT as string);

new Elysia()
	.post("/api/gamestate", (context) => {
		console.dir(context.body, { depth: null });
	})
	.listen(port, () => console.log(`Server is running on ${port}`));
