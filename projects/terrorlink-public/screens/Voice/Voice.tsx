import { GearFill, Headphones, MicFill } from "react-bootstrap-icons";
import Button from "../../components/Button/Button";
import "./Voice.css";
import Stripe from "../../components/Stripe/Stripe";
import { useEffect, useRef, useState } from "react";
import useSpeaker from "../../hooks/useSpeaker";
import useMicrophone from "../../hooks/useMicrophone";

function drawFrequencyData(
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

export function Voice() {
	const speakerCanvasRef = useRef<HTMLCanvasElement>(null);
	const microphoneCanvasRef = useRef<HTMLCanvasElement>(null);

	const speaker = useSpeaker();
	const microphone = useMicrophone();

	const [deafened, setDeafened] = useState(speaker.deafen);
	const [muted, setMuted] = useState(microphone.muted);

	useEffect(() => {
		function onDeafened() {
			setDeafened(true);
		}

		function onUndeafened() {
			setDeafened(false);
		}

		function onMuted() {
			setMuted(true);
		}

		function onUnmuted() {
			setMuted(false);
		}

		speaker.on("deafened", onDeafened);
		speaker.on("undeafened", onUndeafened);
		microphone.on("muted", onMuted);
		microphone.on("unmuted", onUnmuted);

		return () => {
			speaker.off("deafened", onDeafened);
			speaker.off("undeafened", onUndeafened);
			microphone.off("muted", onMuted);
			microphone.off("unmuted", onUnmuted);
		};
	});

	// Draw the frequency data on the canvas
	useEffect(() => {
		let frameId: number;
		function draw() {
			const speakerFrequencyData = speaker.getFrequencyData();
			drawFrequencyData(speakerCanvasRef.current!, speakerFrequencyData);
			const microphoneFrequencyData = microphone.getFrequencyData();
			drawFrequencyData(microphoneCanvasRef.current!, microphoneFrequencyData);
			frameId = requestAnimationFrame(draw);
		}

		draw();

		return () => {
			if (!frameId) return;
			cancelAnimationFrame(frameId);
		};
	});

	return (
		<div className={"Voice"}>
			<canvas ref={microphoneCanvasRef} />
			<canvas ref={speakerCanvasRef} />

			<div className="actionrow">
				<Button onClick={() => microphone.toggleMute()}>
					<Stripe active={muted} />
					<MicFill size={40} />
				</Button>
				<Button onClick={() => speaker.toggleDeafen()}>
					<Stripe active={deafened} />
					<Headphones size={40} />
				</Button>
				<Button>
					<GearFill size={40} />
				</Button>
			</div>
		</div>
	);
}
