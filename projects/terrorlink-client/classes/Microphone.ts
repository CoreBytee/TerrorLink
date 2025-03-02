import { AudioContext, mediaDevices } from "node-web-audio-api";
import type { TerrorLinkClient } from "./TerrorLinkClient";
import { UDPMessageType } from "networking";

export default class Microphone {
	terrorLink: TerrorLinkClient;
	private audioContext: AudioContext;
	private audioAnalyser: AnalyserNode;
	private processor: ScriptProcessorNode;
	frequencyData: Uint8Array<ArrayBuffer>;
	constructor(terrorLink: TerrorLinkClient) {
		this.terrorLink = terrorLink;

		this.audioContext = new AudioContext({ latencyHint: "interactive" });
		this.audioAnalyser = this.audioContext.createAnalyser();
		this.audioAnalyser.fftSize = 32;
		this.audioAnalyser.minDecibels = -90;
		this.audioAnalyser.smoothingTimeConstant = 0.8;

		this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
		this.processor.addEventListener("audioprocess", ({ inputBuffer }) => {
			const channelData = inputBuffer.getChannelData(0);
			const buffer = Buffer.from(channelData.buffer);
			try {
				const encrypted = this.terrorLink.networking.encryptData(buffer);
				this.terrorLink.networking.sendUDPMessage(
					UDPMessageType.Voice,
					encrypted,
				);
			} catch (error) {}
		});

		this.frequencyData = new Uint8Array(this.audioAnalyser.frequencyBinCount);

		this.loadMicrophone();
	}
	async loadMicrophone() {
		await this.audioContext.resume();
		const mediaStream = await mediaDevices.getUserMedia({
			audio: true,
		});

		const source = this.audioContext.createMediaStreamSource(mediaStream);
		source.connect(this.audioAnalyser);
		this.audioAnalyser.connect(this.processor);
		this.processor.connect(this.audioContext.destination);
	}

	async getFrequencyData() {
		this.audioAnalyser.getByteFrequencyData(this.frequencyData);
		return Array.from(this.frequencyData.values());
	}

	get isMuted() {
		return false;
	}

	setMute() {
		return;
	}

	toggleMute() {
		return;
	}
}
