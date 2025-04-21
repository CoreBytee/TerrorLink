import { GearFill, Headphones, MicFill } from "react-bootstrap-icons";
import Button from "../../components/Button/Button";
import "./Voice.css";
import Stripe from "../../components/Stripe/Stripe";
import { useEffect, useRef, useState } from "react";
import useSpeaker from "../../hooks/useSpeaker";
import useMicrophone from "../../hooks/useMicrophone";
import { MessageType, type MessageUpdatePositionsPayload } from "networking";
import useEvents from "../../hooks/useEvents";
import compare from "just-compare";
import { CSTeam } from "gamestate";
import terroristAvatarImage from "../../assets/image/terrorist.png" with {
	type: "file",
};
import counterAvatarImage from "../../assets/image/counter.png" with {
	type: "file",
};
import { PlayerSettings } from "../PlayerSettings/PlayerSettings";
import DebugText from "../../components/DebugText/DebugText";

type RenderPlayer = {
	steamId: string;
	peerId: string;
	name: string;
	me: boolean;
	bot: boolean;
	avatarUrl: string | undefined;
};

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
	const events = useEvents();

	const [deafened, setDeafened] = useState(speaker.deafen);
	const [muted, setMuted] = useState(microphone.muted);
	const [players, setPlayers] = useState<RenderPlayer[]>([]);
	const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

	// Store players
	useEffect(() => {
		function onGamestate(payload: MessageUpdatePositionsPayload) {
			const updated = payload.players.map((player) => ({
				steamId: player.steam_id,
				peerId: player.peer_id ?? "",
				name: player.name,
				me: player.me,
				bot: player.is_bot,
				avatarUrl: player.avatar_url
					? player.avatar_url
					: player.team === CSTeam.Terrorist
						? terroristAvatarImage
						: counterAvatarImage,
			}));

			if (compare(updated, players)) return;
			setPlayers(updated);
		}

		events.on(MessageType.UpdatePositions, onGamestate);

		return () => {
			events.off(MessageType.UpdatePositions, onGamestate);
		};
	});

	// Handle the speaker and microphone events
	useEffect(() => {
		function onDeafened() {
			setDeafened(true);
			microphone.setMute(true);
		}

		function onUndeafened() {
			setDeafened(false);
		}

		function onMuted() {
			setMuted(true);
		}

		function onUnmuted() {
			setMuted(false);
			speaker.setDeafen(false);
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

		if (!speakerCanvasRef.current || !microphoneCanvasRef.current) return;
		draw();

		return () => {
			if (!frameId) return;
			cancelAnimationFrame(frameId);
		};
	});

	if (selectedPlayer) {
		return (
			<PlayerSettings
				peerId={selectedPlayer}
				steamId={
					players.find((player) => player.peerId === selectedPlayer)?.steamId ??
					""
				}
				name={
					players.find((player) => player.peerId === selectedPlayer)?.name ?? ""
				}
				onReturn={() => {
					setSelectedPlayer(null);
				}}
			/>
		);
	}

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

			<div className="players">
				{players.map((player) => (
					<button
						key={player.steamId}
						className="player"
						type="button"
						onClick={() => {
							if (player.me) return;
							setSelectedPlayer(player.peerId);
						}}
					>
						<img src={player.avatarUrl} alt={player.name} className="avatar" />
						<div className="name">{player.name}</div>
					</button>
				))}
			</div>

			<DebugText />
		</div>
	);
}
