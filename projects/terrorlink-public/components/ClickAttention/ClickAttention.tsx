import { HandIndex } from "react-bootstrap-icons";
import "./ClickAttention.css";

export default function ClickAttention({
	active = false,
}: {
	active: boolean;
}) {
	if (!active) return null;
	return (
		<div className="ClickAttention">
			<HandIndex size={window.innerWidth / 3} />
			<h1>Please click anywhere to continue</h1>
		</div>
	);
}
