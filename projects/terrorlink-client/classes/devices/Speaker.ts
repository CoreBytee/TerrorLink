import { AudioContext } from "node-web-audio-api";
import { EventEmitter } from "node:events";

type SpeakerChannel = {
	pannerNode: PannerNode;
	buffer: AudioBuffer | null;
	active: boolean;
};

export class Speaker extends EventEmitter {
	channels: Record<string, SpeakerChannel>;
	audioContext: AudioContext;
	constructor(deviceId?: string) {
		super();

		this.channels = {};
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

	async createChannel(name: string) {
		const exists = await this.existsChannel(name);
		if (exists) return;
		console.log(`Speaker: Creating channel ${name}`);
		const channel: SpeakerChannel = {
			pannerNode: this.audioContext.createPanner(),
			buffer: null,
			active: false,
		};

		channel.pannerNode.panningModel = "HRTF";
		channel.pannerNode.distanceModel = "inverse"; // "inverse" | "linear" | "exponential";
		channel.pannerNode.maxDistance = 800;
		channel.pannerNode.refDistance = 100;
		channel.pannerNode.rolloffFactor = 3;
		// channel.pannerNode.coneInnerAngle = 360; // Full volume within 60 degrees
		// channel.pannerNode.coneOuterAngle = 360; // Reduced volume outside 180 degrees
		// channel.pannerNode.coneOuterGain = 0.5; // 20% volume outside the outer cone
		channel.pannerNode.connect(this.audioContext.destination);

		this.channels[name] = channel;
	}

	async removeChannel(name: string) {
		return;
	}

	async existsChannel(name: string) {
		return name in this.channels;
	}

	async listChannels() {
		return Object.keys(this.channels);
	}

	async setChannelPosition(
		channelName: string,
		position: {
			x: number;
			y: number;
			z: number;
		},
		angle: {
			yaw: number;
			pitch: number;
		},
	) {
		const channel = this.channels[channelName];

		if (!channel) {
			console.error(`Speaker: Channel ${channelName} does not exist`);
			return;
		}

		channel.pannerNode.positionX.setValueAtTime(
			position.x,
			this.audioContext.currentTime,
		);
		channel.pannerNode.positionY.setValueAtTime(
			position.y,
			this.audioContext.currentTime,
		);
		channel.pannerNode.positionZ.setValueAtTime(
			position.z,
			this.audioContext.currentTime,
		);
		channel.pannerNode.orientationX.setValueAtTime(
			Math.cos(angle.yaw) * Math.cos(angle.pitch),
			this.audioContext.currentTime,
		);
		channel.pannerNode.orientationY.setValueAtTime(
			Math.sin(angle.pitch),
			this.audioContext.currentTime,
		);
		channel.pannerNode.orientationZ.setValueAtTime(
			Math.sin(angle.yaw) * Math.cos(angle.pitch),
			this.audioContext.currentTime,
		);
	}

	async setPosition(
		position: {
			x: number;
			y: number;
			z: number;
		},
		angle: {
			yaw: number;
			pitch: number;
		},
	) {
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

		this.audioContext.listener.setOrientation(
			Math.cos(angle.yaw) * Math.cos(angle.pitch), // forwardX
			Math.sin(angle.pitch), // forwardY
			Math.sin(angle.yaw) * Math.cos(angle.pitch), // forwardZ
			0, // upX
			0, // upY
			1, // upZ
		);
	}

	play(channelName: string, buffer: Buffer) {
		const channel = this.channels[channelName];

		if (!channel) {
			console.error(`Speaker: Channel ${channelName} does not exist`);
			return;
		}

		if (channel.active === false && channel.buffer) {
			channel.active = true;
			this.playNext(channelName);
		}

		const float32Array = new Float32Array(buffer.buffer);
		const audioBuffer = this.audioContext.createBuffer(
			1,
			float32Array.length,
			this.audioContext.sampleRate,
		);

		audioBuffer.copyToChannel(float32Array, 0);
		channel.buffer = audioBuffer;
	}

	playNext(channelName: string) {
		const channel = this.channels[channelName];

		if (!channel) {
			console.error(`Speaker: Channel ${channelName} does not exist`);
			return;
		}

		const buffer = channel.buffer;
		channel.buffer = null;

		if (!buffer) {
			channel.active = false;
			console.error(`Speaker: Channel ${channelName} has no buffer`);
			return;
		}

		const bufferSource = this.audioContext.createBufferSource();
		bufferSource.buffer = buffer;
		bufferSource.connect(channel.pannerNode);
		bufferSource.start();
		bufferSource.onended = () => {
			this.playNext(channelName);
		};
	}
}
