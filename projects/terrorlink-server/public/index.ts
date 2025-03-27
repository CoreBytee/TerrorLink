import { pEvent, type AddRemoveListener, type Emitter } from "p-event";
import Peer from "peerjs";
import { setScreen } from "./assets/screens";

const authenticationStatusRequest = await fetch("/authentication/status");
const authenticationStatus = await authenticationStatusRequest.json();
console.log(authenticationStatus);

if (!authenticationStatus.authenticated) {
	const redirectUrl = authenticationStatus.url;
	location.href = redirectUrl;
}

async function getMicrophone() {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: true,
		video: false,
	});
	return stream;
}

const peer = new Peer();

peer.on("call", async (call) => {
	console.log("call", call);
	call.answer(await getMicrophone());
});

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
await pEvent(peer as any, "open");
console.log("Peer ID:", peer.id);

const websocket = new WebSocket(`/events?id=${peer.id}`);

websocket.addEventListener("open", () => {
	setScreen("main")
})

websocket.addEventListener("message", async (rawMessage) => {
	const message = JSON.parse(rawMessage.data);
	console.log("Received message:", message);
	if (message.peerId) {
		console.log("Remote Peer ID:", message.peerId);
		const connection = peer.call(message.peerId, await getMicrophone());

		connection.on("close", () => {
			console.log("Connection closed");
		})

		connection.on("stream", (stream) => {
			console.log("Received stream:", stream);
			const audio = document.createElement("audio");
			document.body.appendChild(audio);
			// audio.srcObject = stream;
			audio.autoplay = true;
		})
	}
});
