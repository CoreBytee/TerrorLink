import { AudioContext, mediaDevices } from "node-web-audio-api";
import { EventEmitter } from "node:events";

export default class Microphone extends EventEmitter {
	private audioContext: AudioContext;
	private mediaStream?: MediaStream;
	private source?: MediaStreamAudioSourceNode;
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
		this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
		this.processor.addEventListener("audioprocess", ({ inputBuffer }) => {
			if (this.isMuted) return;
			const channelData = inputBuffer.getChannelData(0);

			// Apply a limiter to prevent clipping
			const limitedData = channelData.map((sample) =>
				Math.max(-0.9, Math.min(0.9, sample)),
			);

			const float32Array = new Float32Array(channelData); // Ensure proper format
			this.emit("frame", Buffer.from(float32Array.buffer));
		});

		this.frequencyData = new Uint8Array(this.audioAnalyser.frequencyBinCount);

		if (!deviceId) {
			this.listDevices().then((devices) => {
				if (devices.length === 0) {
					console.error("No audio input devices found");
					return;
				}
				this.setDevice(devices[0].id);
			});
		} else {
			this.setDevice(deviceId);
		}
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
		this.source?.disconnect();
		this.processor.disconnect();
		this.audioAnalyser.disconnect();

		// Get the new media stream with the specified deviceId
		this.mediaStream = await mediaDevices.getUserMedia({
			audio: { deviceId: deviceId },
		});

		this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

		// Connect the new media stream
		this.source.connect(this.audioAnalyser);
		this.audioAnalyser.connect(this.processor);
		this.processor.connect(this.audioContext.destination);

		this.emit("device_change", deviceId);
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
