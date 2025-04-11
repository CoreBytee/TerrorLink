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

	const peer = usePeer();
	const speaker = useSpeaker();
	const microphone = useMicrophone();

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

	useEffect(() => {
		if (authenticationStatus) return;
		fetch("/api/authentication/status").then(async (response) => {
			const data = await response.json();
			setAuthenticationStatus(data);
		});
	});

	function handleScreen() {
		if (!authenticationStatus) return <Loading />;
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
