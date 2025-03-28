import {
	mediaDevices,
	AudioContext,
	// eslint-disable-next-line no-unused-vars
	MediaStreamAudioSourceNode,
} from "node-web-audio-api";

console.log(
	"MediaDevices::getUserMedia - mic feedback, be careful with volume...)",
);

console.log(await mediaDevices.enumerateDevices());
const mediaStream = await mediaDevices.getUserMedia({ audio: true });

const audioContext = new AudioContext();
await audioContext.resume();

// const source = new MediaStreamAudioSourceNode(audioContext, { mediaStream });
const source = audioContext.createMediaStreamSource(mediaStream); // factory API
source.connect(audioContext.destination);
