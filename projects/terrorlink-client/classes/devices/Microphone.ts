import { AudioContext, mediaDevices } from "node-web-audio-api";
import { EventEmitter } from "node:events";

export default class Microphone extends EventEmitter {
	private audioContext: AudioContext;
	private mediaStream?: MediaStream;
	private audioAnalyser: AnalyserNode;
	private processor: ScriptProcessorNode;
	private gainNode: GainNode;
	private frequencyData: Uint8Array<ArrayBuffer>;
	constructor(deviceId?: string) {
		super();

		this.audioContext = new AudioContext({ latencyHint: "interactive" });
		this.audioAnalyser = this.audioContext.createAnalyser();
		this.audioAnalyser.fftSize = 32;
		this.audioAnalyser.minDecibels = -90;
		this.audioAnalyser.smoothingTimeConstant = 0.8;
		this.gainNode = this.audioContext.createGain();
		this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
		this.processor.addEventListener("audioprocess", ({ inputBuffer }) => {
			if (this.isMuted) return;
			const channelData = inputBuffer.getChannelData(0);
			const buffer = Buffer.from(channelData.buffer);
			this.emit("frame", buffer);
		});

		this.frequencyData = new Uint8Array(this.audioAnalyser.frequencyBinCount);

		this.load();
	}

	private async load() {
		await this.audioContext.resume();
		this.mediaStream = await mediaDevices.getUserMedia({
			audio: true,
		});

		const source = this.audioContext.createMediaStreamSource(this.mediaStream);
		source.connect(this.gainNode);
		this.gainNode.connect(this.audioAnalyser);
		this.audioAnalyser.connect(this.processor);
		this.processor.connect(this.audioContext.destination);
	}

	/**
	 * List all available audio input devices
	 * @returns An array of audio input devices
	 */
	async listDevices() {
		const devices = await mediaDevices.enumerateDevices();
		return devices
			.filter((d) => d.kind === "audioinput")
			.map((d) => ({ name: d.label, id: d.deviceId }));
	}

	/**
	 *
	 * @returns The current audio input deviceId
	 */
	async getDevice() {
		const devices = await this.listDevices();
		if (!this.mediaStream) {
			this.mediaStream = await mediaDevices.getUserMedia({ audio: true });
		}
		const track = this.mediaStream.getAudioTracks()[0];
		const deviceId = track.getSettings().deviceId;
		return devices.find((d) => d.id === deviceId);
	}

	/**
	 * Set the audio input device
	 * @param deviceId The deviceId of the audio input device
	 */
	async setDevice(deviceId: string) {
		// Disconnect the old device
		this.processor.disconnect();
		this.audioAnalyser.disconnect();

		// Get the new media stream with the specified deviceId
		this.mediaStream = await mediaDevices.getUserMedia({
			audio: { deviceId: { exact: deviceId } },
		});

		// Connect the new media stream
		const source = this.audioContext.createMediaStreamSource(this.mediaStream);
		source.connect(this.audioAnalyser);
		this.audioAnalyser.connect(this.processor);
		this.processor.connect(this.audioContext.destination);
	}

	/**
	 * Get the current audio input volume
	 * @returns The current audio input volume
	 */
	async getFrequencyData() {
		this.audioAnalyser.getByteFrequencyData(this.frequencyData);
		return Array.from(this.frequencyData.values());
	}

	/**
	 * Get if the microphone is muted
	 */
	get isMuted() {
		return this.gainNode.gain.value === 0;
	}

	/**
	 * Mute the microphone
	 * @param state The state to set the microphone to
	 */
	setMute(state: boolean) {
		this.gainNode.gain.value = state ? 0 : 1;
		return this.isMuted;
	}

	/**
	 * Toggle the microphone mute
	 * @returns The new state of the microphone
	 */
	toggleMute() {
		const newState = !this.isMuted;
		this.setMute(newState);
		return newState;
	}
}
