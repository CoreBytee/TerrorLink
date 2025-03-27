import { pEvent } from "p-event";
import Peer from "peerjs";
import { setScreen } from "./assets/screens";
import { EventEmitter } from "node:events";

const authenticationStatusRequest = await fetch("/authentication/status");
const authenticationStatus = await authenticationStatusRequest.json();
console.log(authenticationStatus);

if (!authenticationStatus.authenticated) {
	const redirectUrl = authenticationStatus.url;
	location.href = redirectUrl;
}

class Microphone {
	muted: boolean;
	private audioContext: AudioContext;
	private mediaStreamSource?: MediaStreamAudioSourceNode;
	private gainNode: GainNode;
	private outputStream: MediaStreamAudioDestinationNode;
	constructor() {
		this.muted = false

		this.audioContext = new AudioContext({
			latencyHint: "interactive"
		});

		this.gainNode = this.audioContext.createGain();
		this.outputStream = this.audioContext.createMediaStreamDestination();

		this.gainNode.connect(this.outputStream);

		this.setDevice("")
	}

	async listDevices() {
		return await navigator.mediaDevices.enumerateDevices();
	}

	async setDevice(deviceId: string) {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
		this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
		this.mediaStreamSource.connect(this.gainNode);
	}

	setMute(state: boolean) {

	}

	toggleMute() {
		this.setMute(!this.muted);
	}

	get stream() {
		return this.outputStream.stream;
	}
}

class Socket {
	socket: WebSocket | null;
	constructor() {
		this.socket = null;
	}

	async connect(peerId: string) {
		this.socket = new WebSocket(`/events?id=${peerId}`);
		console.info("Socket: Connecting to server");
		await pEvent(this.socket, "open");
		console.info("Socket: Connected to server");
	}
}

class TerrorLink extends EventEmitter {
	peer: Peer;
	socket: Socket;
	microphone: Microphone;
	constructor() {
		super()
		this.peer = new Peer();
		this.socket = new Socket();
		this.microphone = new Microphone();

		this.peer.once("open", () => {
			this.socket.connect(this.peer.id);
		})
	}
}

new TerrorLink()

// const peer = new Peer();

// peer.on("call", async (call) => {
// 	console.log("call", call);
// 	call.answer(await getMicrophone());
// });

// // biome-ignore lint/suspicious/noExplicitAny: <explanation>
// await pEvent(peer as any, "open");
// console.log("Peer ID:", peer.id);

// const websocket = new WebSocket(`/events?id=${peer.id}`);

// websocket.addEventListener("open", () => {
// 	setScreen("main")
// })

// websocket.addEventListener("message", async (rawMessage) => {
// 	const message = JSON.parse(rawMessage.data);
// 	console.log("Received message:", message);
// 	if (message.peerId) {
// 		console.log("Remote Peer ID:", message.peerId);
// 		const connection = peer.call(message.peerId, await getMicrophone());

// 		connection.on("close", () => {
// 			console.log("Connection closed");
// 		})

// 		connection.on("stream", (stream) => {
// 			console.log("Received stream:", stream);
// 			const audio = document.createElement("audio");
// 			document.body.appendChild(audio);
// 			// audio.srcObject = stream;
// 			audio.autoplay = true;
// 		})
// 	}
// });
