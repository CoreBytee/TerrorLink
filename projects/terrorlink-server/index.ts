import { env } from "bun";
import Elysia from "elysia";
import SteamAuthentication from "./classes/SteamAuthentication";
import jwt from "jwt-simple";
import type { ElysiaWS } from "elysia/ws";
import type { GameStateBody } from "./types/GameStateBody";
import TerrorLinkServer from "./classes/TerrorLinkServer";

console.log("Hello via Bun!");
const port = Number.parseInt(env.NETWORK_PORT as string);

new TerrorLinkServer(port);
