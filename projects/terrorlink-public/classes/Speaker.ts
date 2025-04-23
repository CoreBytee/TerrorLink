import type { angle, position } from "gamestate";
import { TypedEmitter } from "tiny-typed-emitter";

function degreesToRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

interface SpeakerEvents {
	suspended: () => void;
	resumed: () => void;
	deafened: () => void;
	undeafened: () => void;
}

export default class Speaker extends TypedEmitter<SpeakerEvents> {
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
		super();
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

		document.addEventListener("click", () => {
			if (this.audioContext.state === "suspended") {
				console.warn("Resuming speaker audio context");
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
	}

	get isSuspended() {
		return this.audioContext.state === "suspended";
	}

	getFrequencyData() {
		this.analyzerNode.getByteFrequencyData(this.frequencyData);
		return this.frequencyData;
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


		channel.mediaStreamSource.connect(channel.gainNode);
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

		channel.mediaStreamSource.disconnect(channel.gainNode);
		channel.gainNode.disconnect(channel.pannerNode);
		channel.pannerNode.disconnect(this.gainNode);

		delete this.channels[id];
	}

	setChannelVolume(id: string, volume: number) {
		const channel = this.channels[id];

		if (!channel) {
			console.warn("Speaker: Channel not found", id);
			return;
		}

		if (volume > 3) volume = 3;
		if (volume < 0) volume = 0;
		console.info("Speaker: Setting channel volume", id, volume);
		channel.gainNode.gain.value = volume;
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
		console.log("Speaker: Setting listener position", position, angle);
		if (this.audioContext.listener.positionX) {
			this.audioContext.listener.positionX.setValueAtTime(
				position.x,
				this.audioContext.currentTime,
			);
			this.audioContext.listener.positionY.setValueAtTime(
				position.y,
				this.audioContext.currentTime,
			);
			this.audioContext.listener.positionZ.setValueAtTime(
				position.z,
				this.audioContext.currentTime,
			);
		} else {
			this.audioContext.listener.setPosition(
				position.x,
				position.y,
				position.z,
			);
		}

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
		this.deafen ? this.emit("deafened") : this.emit("undeafened");
	}

	toggleDeafen() {
		this.setDeafen(!this.deafen);
	}
}
