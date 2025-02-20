import { env } from "bun";
import Elysia from "elysia";

console.log("Hello via Bun!");
const port = Number.parseInt(env.WEBSERVER_PORT as string);

new Elysia().listen(port, () => console.log(`Server is running on ${port}`));
