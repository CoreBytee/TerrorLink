import { pEvent } from "p-event";
import Peer from "peerjs";
import { setScreen } from "./assets/screens";
import { EventEmitter } from "node:events";
import {
	MessageType,
	type Message,
	type MessageActivePeersPayload,
	type MessageConnectPeerPayload,
} from "networking";
import type { JSONValue } from "jsonvalue";

const authenticationStatusRequest = await fetch("/authentication/status");
const authenticationStatus = await authenticationStatusRequest.json();
console.log(authenticationStatus);

if (!authenticationStatus.authenticated) {
	const redirectUrl = authenticationStatus.url;
	location.href = redirectUrl;
}

function writeFrequencyData(
	canvas: HTMLCanvasElement,
	frequencyData: Uint8Array<ArrayBuffer>,
) {
	const context = canvas.getContext("2d");
	if (!context) return;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;

	canvas.width = width;
	canvas.height = height;

	const barWidth = width / frequencyData.length;
	const barHeight = height / 255;

	context.clearRect(0, 0, width, height);
	context.fillStyle = "white";

	frequencyData.forEach((value, i) => {
		const x = i * barWidth;
		const y = height - value * barHeight;

		context.fillRect(x, y, barWidth, height - y);
	});
}

class Microphone {
	muted: boolean;
	private frequencyData: Uint8Array<ArrayBuffer>;
	private audioContext: AudioContext;
	private mediaStreamSource?: MediaStreamAudioSourceNode;
	private gainNode: GainNode;
	private analyzerNode: AnalyserNode;
	private outputStream: MediaStreamAudioDestinationNode;
	rawStream?: MediaStream;
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

		document.body.addEventListener("click", () => {
			if (this.audioContext.state === "suspended") {
				this.audioContext.resume();
			}
		});

		this.setDevice("");
		this.updateGraph();
	}

	private updateGraph() {
		requestAnimationFrame(() => {
			this.updateGraph();
		});

		this.analyzerNode.getByteFrequencyData(this.frequencyData);
		writeFrequencyData(
			document.querySelector("#microphone-graph") as HTMLCanvasElement,
			this.frequencyData,
		);
	}

	async listDevices() {
		return await navigator.mediaDevices.enumerateDevices();
	}

	async setDevice(deviceId: string) {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false,
		});
		console.info("Got microphone stream");
		this.rawStream = stream;
		this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
		this.mediaStreamSource.connect(this.gainNode);
	}

	setMute(state: boolean) {
		this.gainNode.gain.value = state ? 0 : 1;
		this.muted = state;
	}

	toggleMute() {
		this.setMute(!this.muted);
	}

	get stream() {
		return this.outputStream.stream;
	}
}

class Speaker {
	channels: Record<string, unknown>;
	deafen: boolean;
	private audioContext: AudioContext;
	private gainNode: GainNode;
	private analyzerNode: AnalyserNode;
	private frequencyData: Uint8Array<ArrayBuffer>;
	constructor() {
		this.channels = {};
		this.deafen = false;

		this.audioContext = new AudioContext({
			latencyHint: "interactive",
		});

		this.gainNode = this.audioContext.createGain();

		this.analyzerNode = this.audioContext.createAnalyser();
		this.analyzerNode.fftSize = 32;
		this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount);

		this.gainNode.connect(this.analyzerNode);
		this.analyzerNode.connect(this.audioContext.destination);

		document.body.addEventListener("click", () => {
			if (this.audioContext.state === "suspended") {
				this.audioContext.resume();
			}
		});

		this.updateGraph();
	}

	private updateGraph() {
		requestAnimationFrame(() => {
			this.updateGraph();
		});

		this.analyzerNode.getByteFrequencyData(this.frequencyData);

		writeFrequencyData(
			document.querySelector("#speaker-graph") as HTMLCanvasElement,
			this.frequencyData,
		);
	}

	addStream(stream: MediaStream) {
		console.info("Speaker: Adding stream", stream);

		const mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
		mediaStreamSource.connect(this.gainNode);
	}

	setDeafen(state: boolean) {
		this.gainNode.gain.value = state ? 0 : 1;
		this.deafen = state;
	}

	toggleDeafen() {
		this.setDeafen(!this.deafen);
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
			console.info("Received message:", message);
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
	speaker: Speaker;
	constructor() {
		this.peer = new Peer();
		this.socket = new Socket();
		this.microphone = new Microphone();
		this.speaker = new Speaker();

		this.peer.once("open", async (id) => {
			console.info("My peer ID:", id);
			await this.socket.connect(this.peer.id);
			setScreen("main");
		});

		this.peer.on("call", async (call) => {
			console.info("Incoming call", call);
			call.answer();

			call.on("stream", (stream) => {
				console.info("Received stream from incoming call:", stream);
				this.speaker.addStream(stream);
			});
		});

		this.socket.on(
			MessageType.ConnectPeer,
			async (payload: MessageConnectPeerPayload) => {
				console.info("Calling peer ID:", payload.peerId);
				const call = this.peer.call(payload.peerId, this.microphone.stream);
			},
		);

		this.socket.on(
			MessageType.ActivePeers,
			(payload: MessageActivePeersPayload) => {
				payload.peers.forEach((peerId) => {
					console.info("Calling peer ID:", peerId);
					const call = this.peer.call(peerId, this.microphone.stream);
				});
			},
		);

		const muteButton = document.querySelector(
			"button#mute",
		) as HTMLButtonElement | null;

		const deafenButton = document.querySelector(
			"button#deafen",
		) as HTMLButtonElement | null;

		function updateButtons(microphone: Microphone, speaker: Speaker) {
			microphone.muted
				? muteButton?.classList.add("active")
				: muteButton?.classList.remove("active");
			speaker.deafen
				? deafenButton?.classList.add("active")
				: deafenButton?.classList.remove("active");
		}

		muteButton?.addEventListener("click", (event) => {
			this.microphone.toggleMute();
			this.microphone.muted ? null : this.speaker.setDeafen(false);
			updateButtons(this.microphone, this.speaker);
		});

		deafenButton?.addEventListener("click", (event) => {
			this.speaker.toggleDeafen();
			this.microphone.setMute(this.speaker.deafen);
			updateButtons(this.microphone, this.speaker);
		});
	}
}

new TerrorLink();
