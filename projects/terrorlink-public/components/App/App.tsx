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

	// Show ClickAttention if the speaker or microphone is suspended
	useEffect(() => {
		if (speaker.isSuspended || microphone.isSuspended) setNeedsAttention(true);

		function onResumed() {
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
