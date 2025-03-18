import { AudioContext } from "node-web-audio-api";
import { EventEmitter } from "node:events";

export class Speaker extends EventEmitter {
	audioContext: AudioContext;
	constructor(deviceId?: string) {
		super();

		this.audioContext = new AudioContext({ latencyHint: "interactive" });
	}

	async listDevices() {
		return [];
	}

	async getDevice() {
		return null;
	}

	async setDevice(deviceId: string) {
		return;
	}

	play(buffer: Buffer) {
		const float32Array = new Float32Array(buffer.buffer);

		// Apply fade-in and fade-out to smooth transitions
		for (let i = 0; i < float32Array.length; i++) {
			const fadeFactor =
				i < 100
					? i / 100
					: i > float32Array.length - 100
						? (float32Array.length - i) / 100
						: 1;
			float32Array[i] *= fadeFactor;
		}

		const audioBuffer = this.audioContext.createBuffer(
			1,
			float32Array.length,
			this.audioContext.sampleRate,
		);
		audioBuffer.copyToChannel(float32Array, 0); // Ensure proper channel alignment
		const bufferSource = this.audioContext.createBufferSource();
		bufferSource.buffer = audioBuffer;
		bufferSource.connect(this.audioContext.destination);
		bufferSource.start();
	}
}
