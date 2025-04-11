import { Loading } from "../../screens/Loading/Loading";

import "../../assets/style/index.css";
import "./App.css";
import { useEffect, useState } from "react";
import { Login } from "../../screens/Login/Login";
import { Voice } from "../../screens/Voice/Voice";

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
	console.log(authenticationStatus);

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
		<div className="App">
			<div>{screen}</div>
		</div>
	);
}
