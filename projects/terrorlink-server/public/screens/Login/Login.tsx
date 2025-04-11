import "./Login.css";

export function Login() {
	return (
		<div className={"Login"}>
			<h1>Login</h1>
			<p>
				You must be logged in using Steam to use TerrorLink. You can login by
				pressing the button below.
			</p>
			<button type="button">Login using Steam</button>
		</div>
	);
}
