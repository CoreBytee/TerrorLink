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
		fetch("/api/authentication/status")
			.then((response) => {
				return response.json();
			})
			.then((data) => {
				setAuthenticationStatus(data);
			});
	});

	const Screen = authenticationStatus
		? authenticationStatus.authenticated
			? Voice
			: Login
		: Loading;

	return (
		<div className="App">
			<div>
				<Screen />
			</div>
		</div>
	);
}
