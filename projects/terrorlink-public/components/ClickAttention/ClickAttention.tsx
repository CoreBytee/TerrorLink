import { HandIndex } from "react-bootstrap-icons";
import "./ClickAttention.css";
import { useEffect, useState } from "react";

export default function ClickAttention({
	active = false,
}: {
	active: boolean;
}) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (active) {
			const timer = setTimeout(() => setIsVisible(true), 100);
			return () => clearTimeout(timer);
		}
		setIsVisible(false);
	}, [active]);

	if (!isVisible) return null;

	return (
		<div className="ClickAttention">
			<HandIndex size={window.innerWidth / 3} />
			<h1>Please click anywhere to continue</h1>
		</div>
	);
}
