import { pEvent } from "p-event";
import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { setScreen } from "./assets/screens";
import { EventEmitter } from "node:events";
import {
	MessageType,
	type Message,
	type MessageUpdatePositionsPayload,
} from "networking";
import type { JSONValue } from "jsonvalue";
import bytes from "bytes";
import { CSTeam, type angle, type position } from "gamestate";

import terroristAvatarImage from "./assets/image/terrorist.png";
import counterAvatarImage from "./assets/image/counter.png";

const envRequest = await fetch("/api/env");
const env = await envRequest.json();
const isProduction = env.env === "production";

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

function degreesToRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
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
				console.warn("Resuming microphone audio context");
				this.audioContext.resume();
			}
		});

		const urlParams = new URLSearchParams(window.location.search);
		const muteParam = urlParams.get("mute");
		if (muteParam === "true") {
			this.setMute(true);
		} else if (muteParam === "false") {
			this.setMute(false);
		}

		this.loadDevice();
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

	async loadDevice() {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: isProduction
				? {
						echoCancellation: true,
						noiseSuppression: true,
					}
				: {
						echoCancellation: false,
						noiseSuppression: false,
					},
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
	channels: Record<
		string,
		{
			mediaStreamSource: MediaStreamAudioSourceNode;
			gainNode: GainNode;
			pannerNode: PannerNode;
		}
	>;
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
				console.warn("Resuming speaker audio context");
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

	createChannel(id: string, stream: MediaStream) {
		console.info("Speaker: Adding stream", id, stream);

		const channel = {
			mediaStreamSource: this.audioContext.createMediaStreamSource(stream),
			gainNode: this.audioContext.createGain(),
			pannerNode: this.audioContext.createPanner(),
		};

		channel.pannerNode.panningModel = "HRTF";
		channel.pannerNode.distanceModel = "linear";
		channel.pannerNode.maxDistance = 1000;
		channel.pannerNode.refDistance = 100;
		channel.pannerNode.rolloffFactor = 3;
		// channel.pannerNode.coneInnerAngle = 45;
		// channel.pannerNode.coneOuterAngle = 45;
		channel.pannerNode.coneOuterGain = 1;
		channel.pannerNode.setPosition(0, 0, 0);
		channel.pannerNode.setOrientation(0, 0, 0);

		channel.mediaStreamSource.connect(channel.pannerNode);
		channel.gainNode.connect(channel.pannerNode);
		channel.pannerNode.connect(this.gainNode);

		this.channels[id] = channel;
	}

	removeChannel(id: string) {
		console.info("Speaker: Removing channel", id);
		const channel = this.channels[id];

		if (!channel) {
			console.warn("Speaker: Channel not found", id);
			return;
		}

		channel.mediaStreamSource.disconnect(channel.pannerNode);
		channel.gainNode.disconnect(channel.pannerNode);
		channel.pannerNode.disconnect(this.gainNode);

		delete this.channels[id];
	}

	setChannelPosition(id: string, position: position, angle: angle) {
		const channel = this.channels[id];

		if (!channel) {
			console.warn("Speaker: Channel not found", id);
			return;
		}

		channel.pannerNode.positionX.value = position.x;
		channel.pannerNode.positionY.value = position.y;
		channel.pannerNode.positionZ.value = position.z;

		const yawInRadians = degreesToRadians(angle.y);
		const pitchInRadians = degreesToRadians(angle.x);
		const rollInRadians = degreesToRadians(angle.z);

		channel.pannerNode.orientationX.value =
			Math.cos(pitchInRadians) * Math.cos(yawInRadians);
		channel.pannerNode.orientationY.value =
			Math.sin(pitchInRadians) * Math.cos(rollInRadians);
		channel.pannerNode.orientationZ.value =
			Math.cos(pitchInRadians) * Math.sin(yawInRadians);
	}

	setPosition(position: position, angle: angle) {
		this.audioContext.listener.setPosition(position.x, position.y, position.z);
		const yawInRadians = degreesToRadians(angle.y);
		const pitchInRadians = degreesToRadians(angle.x);
		const rollInRadians = degreesToRadians(angle.z);

		this.audioContext.listener.setOrientation(
			Math.cos(pitchInRadians) * Math.cos(yawInRadians),
			Math.sin(pitchInRadians) * Math.cos(rollInRadians),
			Math.cos(pitchInRadians) * Math.sin(yawInRadians),
			0,
			-1,
			0,
		);
	}

	channelExists(id: string | undefined) {
		if (!id) return false;
		return id in this.channels;
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
	messagesReceived: number;
	bytesReceived: number;
	messagesSent: number;
	bytesSent: number;
	constructor() {
		super();
		this.socket = null;

		this.messagesReceived = 0;
		this.bytesReceived = 0;
		this.messagesSent = 0;
		this.bytesSent = 0;
	}

	async connect(peerId: string) {
		this.messagesReceived = 0;
		this.bytesReceived = 0;
		this.messagesSent = 0;
		this.bytesSent = 0;

		this.socket = new WebSocket(`/api/events?id=${peerId}`);

		this.socket.addEventListener("message", (rawMessage) => {
			const message = JSON.parse(rawMessage.data) as Message;
			this.messagesReceived++;
			this.bytesReceived += rawMessage.data.length;
			this.emit(message.type, message.payload);
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

		this.messagesSent++;
		this.bytesSent += rawMessage.length;

		this.socket.send(rawMessage);
	}
}

class TerrorLink {
	peer: Peer;
	socket: Socket;
	microphone: Microphone;
	speaker: Speaker;
	gamestatePing: number;
	serverPing: number;
	clientPing: number;
	gamestatePeers: string[];
	constructor() {
		this.peer = new Peer();
		this.socket = new Socket();
		this.microphone = new Microphone();
		this.speaker = new Speaker();

		this.gamestatePing = 0;
		this.serverPing = 0;
		this.clientPing = 0;

		this.gamestatePeers = [];

		this.peer.once("open", async (id) => {
			console.info("My peer ID:", id);
			await this.socket.connect(this.peer.id);
			setScreen("main");
		});

		this.peer.on("call", async (call) => {
			console.info("Incoming call", call);
			console.log(this.gamestatePeers);
			if (this.gamestatePeers.includes(call.peer)) {
				console.info("Accepting call", call.peer);
				call.answer();
			} else {
				console.warn("Rejecting call", call.peer);
				call.close();
			}

			call.on("stream", (stream) => {
				console.info("Received stream from incoming call:", stream);
				this.speaker.createChannel(call.peer, stream);
			});
		});

		this.socket.on(
			MessageType.UpdatePositions,
			(payload: MessageUpdatePositionsPayload) => {
				this.gamestatePing = Date.now() - payload.time;
				this.serverPing = payload.serverPing;
				this.clientPing = Date.now() - payload.serverTime;
				const players = payload.players;
				let me = players.find((p) => p.me);

				if (!me) throw new Error("No me in positions");

				if (me.spectate_target) {
					me = players.find((p) => p.user_id === me!.spectate_target);
					if (!me) throw new Error("No target in positions");
				}

				this.speaker.setPosition(me?.position, me?.angle);

				players.forEach((player) => {
					if (player.me) return;
					if (!player.peer_id) return;

					if (!this.speaker.channelExists(player.peer_id))
						return console.log("Channel not found", player.peer_id);
					this.speaker.setChannelPosition(
						player.peer_id,
						player.position,
						player.angle,
					);
				});
			},
		);

		this.socket.on(
			MessageType.UpdatePositions,
			(payload: MessageUpdatePositionsPayload) => {
				const players = payload.players;
				const connections = this.peer.connections;

				this.gamestatePeers = players
					.map((p) => p.peer_id)
					.filter((peerId): peerId is string => peerId !== undefined);

				for (const player of players) {
					if (player.me) continue;
					if (!player.peer_id) continue;
					// @ts-ignore
					if (!connections[player.peer_id!]) {
						console.info("Creating new call", player.peer_id);
						this.peer.call(player.peer_id!, this.microphone.stream);
					}
				}

				for (const connectionEntry of Object.entries(connections)) {
					const [peerId, connections] = connectionEntry;
					const player = players.find((p) => p.peer_id === peerId);
					if (player) continue;
					connections.forEach(
						(connection: MediaConnection | DataConnection) => {
							connection.close();
						},
					);
					this.speaker.removeChannel(peerId);
				}
			},
		);

		this.renderDebug();
		this.setupMainScreenHandlers();
		this.setupSettingsScreenHandlers();
	}

	private renderDebug() {
		requestAnimationFrame(() => {
			this.renderDebug();
		});
		const debug = document.querySelector("#debug") as HTMLDivElement;
		debug.innerText = `FP: ${this.gamestatePing}ms CP: ${this.clientPing}ms SP: ${this.serverPing}ms S: ${this.socket.messagesSent}/${bytes(this.socket.bytesSent)} R: ${this.socket.messagesReceived}/${bytes(this.socket.bytesReceived)}`;
	}

	private setupMainScreenHandlers() {
		// #region Buttons
		const muteButton = document.querySelector(
			"button#mute",
		) as HTMLButtonElement | null;

		const deafenButton = document.querySelector(
			"button#deafen",
		) as HTMLButtonElement | null;

		const settingsButton = document.querySelector(
			"button#settings",
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

		settingsButton?.addEventListener("click", (event) => {
			setScreen("settings");
		});
		// #endregion

		// #region Microphone
		const peersContainer = document.querySelector(".peers") as HTMLDivElement;
		this.socket.on(
			MessageType.UpdatePositions,
			(payload: MessageUpdatePositionsPayload) => {
				const players = payload.players;

				const childNodes = Array.from(peersContainer.childNodes).filter(
					(node) => node instanceof HTMLButtonElement,
				);
				childNodes.forEach((node) => {
					const userId = node.getAttribute("data-user-id");
					const player = players.find((p) => p.user_id === userId);
					if (player) return;
					peersContainer.removeChild(node);
				});

				players.forEach((player) => {
					const nodeExists = childNodes.find(
						(node) =>
							node.getAttribute("data-user-id") === player.user_id.toString(),
					);
					if (nodeExists) return;
					const node = document.createElement("button");
					node.classList.add("peer");
					node.setAttribute("data-user-id", player.user_id);
					node.style.setProperty(
						"--avatar-url",
						`url(${player.avatar_url ?? (player.team === CSTeam.CounterTerrorist ? counterAvatarImage : terroristAvatarImage)})`,
					);
					node.setAttribute("data-name", player.name);
					peersContainer.appendChild(node);
				});
			},
		);
		// #endregion
	}

	private setupSettingsScreenHandlers() {}
}

new TerrorLink();
