import Button from "../../components/Button/Button";
import { Steam } from "react-bootstrap-icons";
import "./Login.css";

type LoginUrlResponse = {
	url: string;
};

export function Login() {
	async function onLogin() {
		const response = await fetch("/api/authentication/url");
		const data = (await response.json()) as LoginUrlResponse;
		location.href = data.url;
	}

	return (
		<div className={"Login"}>
			<h1>Login</h1>
			<p>
				You must be logged in using Steam to use TerrorLink. You can login by
				pressing the button below.
			</p>
			<Button onClick={onLogin}>
				<Steam /> Login with Steam
			</Button>
		</div>
	);
}
