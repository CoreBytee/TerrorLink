import { pEvent } from "p-event";
import Peer from "peerjs";
import { setScreen } from "./assets/screens";
import { EventEmitter } from "node:events";
import type { Message, MessageType } from "networking";
import type { JSONValue } from "jsonvalue";

const authenticationStatusRequest = await fetch("/authentication/status");
const authenticationStatus = await authenticationStatusRequest.json();
console.log(authenticationStatus);

if (!authenticationStatus.authenticated) {
	const redirectUrl = authenticationStatus.url;
	location.href = redirectUrl;
}

class Microphone {
	muted: boolean;
	private frequencyData: Uint8Array<ArrayBuffer>;
	private audioContext: AudioContext;
	private mediaStreamSource?: MediaStreamAudioSourceNode;
	private gainNode: GainNode;
	private analyzerNode: AnalyserNode;
	private outputStream: MediaStreamAudioDestinationNode;
	constructor() {
		this.muted = false;

		this.audioContext = new AudioContext({
			latencyHint: "interactive",
		});

		this.gainNode = this.audioContext.createGain();
		this.analyzerNode = this.audioContext.createAnalyser();
		this.outputStream = this.audioContext.createMediaStreamDestination();

		this.analyzerNode.fftSize = 32;
		this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);

		this.gainNode.connect(this.analyzerNode);
		this.analyzerNode.connect(this.outputStream);

		this.setDevice("");
		this.updateGraph();
	}

	private updateGraph() {
		requestAnimationFrame(() => {
			this.updateGraph();
		});

		this.analyzerNode.getByteFrequencyData(this.frequencyData);

		const canvas = document.querySelector(
			"#microphone-graph",
		) as HTMLCanvasElement;
		const context = canvas.getContext("2d");
		if (!context) return;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		canvas.width = width;
		canvas.height = height;

		const barWidth = width / this.frequencyData.length;
		const barHeight = height / 255;

		context.clearRect(0, 0, width, height);
		context.fillStyle = "white";

		this.frequencyData.forEach((value, i) => {
			const x = i * barWidth;
			const y = height - value * barHeight;

			context.fillRect(x, y, barWidth, height - y);
		});
	}

	async listDevices() {
		return await navigator.mediaDevices.enumerateDevices();
	}

	async setDevice(deviceId: string) {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false,
		});
		this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
		this.mediaStreamSource.connect(this.gainNode);
	}

	setMute(state: boolean) {
		this.gainNode.gain.value = state ? 1 : 0;
	}

	toggleMute() {
		this.setMute(!this.muted);
	}

	get stream() {
		return this.outputStream.stream;
	}
}

class Socket extends EventEmitter {
	socket: WebSocket | null;
	constructor() {
		super();
		this.socket = null;
	}

	async connect(peerId: string) {
		this.socket = new WebSocket(`/api/events?id=${peerId}`);

		this.socket.addEventListener("message", (rawMessage) => {
			const message = JSON.parse(rawMessage.data) as Message;
			this.emit(message.type, message.payload);
			console.log("Received message:", message);
		});

		console.info("Socket: Connecting to server");
		await pEvent(this.socket, "open");
		console.info("Socket: Connected to server");
	}

	sendMessage<Payload = JSONValue>(type: MessageType, payload: Payload) {
		const rawMessage = JSON.stringify({
			type,
			payload,
		} as Message<Payload>);

		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			console.error("Socket: Not connected to server");
			return;
		}

		this.socket.send(rawMessage);
	}
}

class TerrorLink {
	peer: Peer;
	socket: Socket;
	microphone: Microphone;
	constructor() {
		this.peer = new Peer();
		this.socket = new Socket();
		this.microphone = new Microphone();

		this.peer.once("open", async (id) => {
			console.log("Peer ID:", id);
			await this.socket.connect(this.peer.id);
			setScreen("main");
		});
	}
}

new TerrorLink();

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
