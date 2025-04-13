import { TypedEmitter } from "tiny-typed-emitter";

const isProduction = false;

interface MicrophoneEvents {
	suspended: () => void;
	resumed: () => void;
	muted: () => void;
	unmuted: () => void;
}

export default class Microphone extends TypedEmitter<MicrophoneEvents> {
	muted: boolean;
	private frequencyData: Uint8Array<ArrayBuffer>;
	private audioContext: AudioContext;
	private mediaStreamSource?: MediaStreamAudioSourceNode;
	private gainNode: GainNode;
	private analyzerNode: AnalyserNode;
	private outputStream: MediaStreamAudioDestinationNode;
	rawStream?: MediaStream;
	constructor() {
		super();
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

		document.addEventListener("click", () => {
			if (this.audioContext.state === "suspended") {
				console.warn("Resuming microphone audio context");
				this.audioContext.resume();
			}
		});

		this.audioContext.addEventListener("statechange", () => {
			if (this.audioContext.state === "suspended") {
				this.emit("suspended");
			} else if (this.audioContext.state === "running") {
				this.emit("resumed");
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
	}

	get isSuspended() {
		return this.audioContext.state === "suspended";
	}

	getFrequencyData() {
		this.analyzerNode.getByteFrequencyData(this.frequencyData);
		return this.frequencyData;
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
		this.muted ? this.emit("muted") : this.emit("unmuted");
	}

	toggleMute() {
		this.setMute(!this.muted);
	}

	get stream() {
		return this.outputStream.stream;
	}
}
