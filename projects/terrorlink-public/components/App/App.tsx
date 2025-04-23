import { Loading } from "../../screens/Loading/Loading";

import "../../assets/style/index.css";
import "./App.css";
import { use, useEffect, useState } from "react";
import { Login } from "../../screens/Login/Login";
import { Voice } from "../../screens/Voice/Voice";
import usePeer from "../../hooks/usePeer";
import useSpeaker from "../../hooks/useSpeaker";
import useMicrophone from "../../hooks/useMicrophone";
import ClickAttention from "../ClickAttention/ClickAttention";
import useEvents from "../../hooks/useEvents";
import { MessageType, type MessageUpdatePositionsPayload } from "networking";
import type { DataConnection, MediaConnection } from "peerjs";
import compare from "just-compare";

type AuthenticationStatus = {
	authenticated: boolean;
	user: {
		id: string;
		displayName: string;
		avatarUrl: string;
	};
};

type Peers = {
	[key: string]: string;
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

	const [peers, setPeers] = useState<Peers>({});

	// Connect to events socket
	useEffect(() => {
		function onOpen() {
			if (!authenticationStatus?.authenticated) return;
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

	// Store peers
	useEffect(() => {
		function onGamestate(payload: MessageUpdatePositionsPayload) {
			const players = payload.players;
			const newPeers: Peers = {};

			for (const player of players) {
				if (!player.peer_id) continue;
				newPeers[player.steam_id] = player.peer_id;
			}

			if (compare(newPeers, peers)) return;
			setPeers(newPeers);
		}

		events.on(MessageType.UpdatePositions, onGamestate);
		return () => {
			events.off(MessageType.UpdatePositions, onGamestate);
		};
	});

	// Handle peer connections
	useEffect(() => {
		function onGamestate(payload: MessageUpdatePositionsPayload) {
			const players = payload.players;

			for (const player of players) {
				if (player.me) continue;
				if (!player.peer_id) continue;
				// @ts-ignore peerjs did something weird with the types
				if (peer.connections[player.peer_id]) continue;
				console.info("Calling peer", player.peer_id);
				peer.call(player.peer_id, microphone.stream);
			}

			for (const connectionEntry of Object.entries(peer.connections)) {
				const [peerId, connections] = connectionEntry;
				if (connections.length === 0) continue;
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

			console.log(peers);

			if (!Object.values(peers).includes(call.peer)) {
				console.warn("Peer not found in peers list", call.peer);
				call.close();
				return;
			}

			console.info("Answering call from", call.peer);
			call.answer();

			call.once("stream", (stream) => {
				console.info("Got stream from peer", call.peer);
				speaker.createChannel(call.peer, stream);
				speaker.setChannelVolume(
					call.peer,
					Number.parseInt(
						localStorage.getItem(`playervolume-${peers[call.peer]}`) ?? "1",
					),
				);
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
		if (!authenticationStatus) return <Loading />;
		if (!authenticationStatus.authenticated) return <Login />;
		if (!isConnected) return <Loading />;
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
