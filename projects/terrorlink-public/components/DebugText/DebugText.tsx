import { useEffect, useRef } from "react";
import "./DebugText.css";
import useEvents from "../../hooks/useEvents";
import { MessageType, type MessageUpdatePositionsPayload } from "networking";
import bytes from "bytes";

export default function DebugText() {
	const events = useEvents();
	const textRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		let lastGamestate: MessageUpdatePositionsPayload | null = null;
		let frameId = 0;
		let lastFrameTime = 0;
		function onGamestate(payload: MessageUpdatePositionsPayload) {
			lastGamestate = payload;
		}

		function draw() {
			frameId = requestAnimationFrame(draw);
			if (!lastGamestate) return;
			if (!textRef.current) return;
			const now = Date.now();
			if (now - lastFrameTime < 50) return;
			lastFrameTime = now;

			console.log("Drawing debug text");

			const fullPing = Date.now() - lastGamestate.time;
			const clientPing = Date.now() - lastGamestate.serverTime;
			const serverPing = lastGamestate.serverPing;

			textRef.current.innerText = `Full Ping: ${fullPing.toString().padStart(4, "0")}ms Client Ping: ${clientPing.toString().padStart(4, "0")}ms Server Ping: ${serverPing.toString().padStart(4, "0")}ms
				Sent: ${events.messagesSent}/${bytes(events.bytesSent)} Received: ${events.messagesReceived}/${bytes(events.bytesReceived)}`;
		}

		events.on(MessageType.UpdatePositions, onGamestate);
		draw();

		return () => {
			events.off(MessageType.UpdatePositions, onGamestate);
			cancelAnimationFrame(frameId);
		};
	});

	return (
		<p className="DebugText" ref={textRef}>
			No data received
		</p>
	);
}
