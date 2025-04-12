import { Loading } from "../../screens/Loading/Loading";

import "../../assets/style/index.css";
import "./App.css";
import { useEffect, useState } from "react";
import { Login } from "../../screens/Login/Login";
import { Voice } from "../../screens/Voice/Voice";
import usePeer from "../../hooks/usePeer";
import useSpeaker from "../../hooks/useSpeaker";
import useMicrophone from "../../hooks/useMicrophone";
import ClickAttention from "../ClickAttention/ClickAttention";
import useEvents from "../../hooks/useEvents";
import { MessageType, type MessageUpdatePositionsPayload } from "networking";
import type { DataConnection, MediaConnection } from "peerjs";

type AuthenticationStatus = {
	authenticated: boolean;
	user: {
		id: string;
		displayName: string;
		avatarUrl: string;
	};
};

export default function App() {
	const [authenticationStatus, setAuthenticationStatus] =
		useState<AuthenticationStatus | null>(null);

	const [needsAttention, setNeedsAttention] = useState(false);
	const [isConnected, setIsConnected] = useState(false);

	const events = useEvents();
	const peer = usePeer();
	const speaker = useSpeaker();
	const microphone = useMicrophone();

	// Connect to events socket
	useEffect(() => {
		function onOpen() {
			console.info("My peer ID is", peer.id);
			events.connect(peer.id);
		}

		function onConnect() {
			setIsConnected(true);
		}

		peer.on("open", onOpen);
		events.on("connect", onConnect);

		return () => {
			peer.off("open", onOpen);
			events.off("connect", onConnect);
		};
	});

	// Handle peer connections
	useEffect(() => {
		function onGamestate(payload: MessageUpdatePositionsPayload) {
			const players = payload.players;

			for (const player of players) {
				if (player.me) continue;
				if (!player.peer_id) continue;
				// @ts-ignore
				if (peer.connections[player.peer_id]) continue;
				console.info("Calling peer", player.peer_id);
				peer.call(player.peer_id, microphone.stream);
			}

			for (const connectionEntry of Object.entries(peer.connections)) {
				const [peerId, connections] = connectionEntry;
				const player = players.find((p) => p.peer_id === peerId);
				if (player) continue;
				console.info("Closing connection to peer", peerId);
				connections.forEach((connection: MediaConnection | DataConnection) => {
					connection.close();
				});
				speaker.removeChannel(peerId);
			}
		}

		function onCall(call: MediaConnection) {
			console.info("Incoming call from", call.peer);
			call.answer();

			call.once("stream", (stream) => {
				speaker.createChannel(call.peer, stream);
			});
		}

		events.on(MessageType.UpdatePositions, onGamestate);
		peer.addListener("call", onCall);
		return () => {
			events.off(MessageType.UpdatePositions, onGamestate);
			peer.removeListener("call", onCall);
		};
	});

	// Handle peer postions
	useEffect(() => {
		function onGamestate(payload: MessageUpdatePositionsPayload) {
			const players = payload.players;

			for (const player of players) {
				if (!player.peer_id) continue;
				if (!speaker.channelExists(player.peer_id)) continue;

				if (player.me) {
					speaker.setPosition(player.position, player.angle);
				} else {
					speaker.setChannelPosition(
						player.peer_id,
						player.position,
						player.angle,
					);
				}
			}
		}

		events.on(MessageType.UpdatePositions, onGamestate);
		return () => {
			events.off(MessageType.UpdatePositions, onGamestate);
		};
	});

	// Show ClickAttention if the speaker or microphone is suspended
	useEffect(() => {
		if (speaker.isSuspended || microphone.isSuspended) setNeedsAttention(true);

		function onResumed() {
			if (speaker.isSuspended || microphone.isSuspended) return;
			setNeedsAttention(false);
		}

		speaker.on("resumed", onResumed);
		microphone.on("resumed", onResumed);

		return () => {
			speaker.off("resumed", onResumed);
			microphone.off("resumed", onResumed);
		};
	}, [speaker, microphone]);

	// Fetch authentication status
	useEffect(() => {
		if (authenticationStatus) return;
		fetch("/api/authentication/status").then(async (response) => {
			const data = await response.json();
			setAuthenticationStatus(data);
		});
	});

	function handleScreen() {
		if (!authenticationStatus || !isConnected) return <Loading />;
		if (authenticationStatus.authenticated) return <Voice />;
		return <Login />;
	}

	const screen = handleScreen();

	return (
		<>
			<ClickAttention active={needsAttention} />
			<div className="App">
				<div>{screen}</div>
			</div>
		</>
	);
}
