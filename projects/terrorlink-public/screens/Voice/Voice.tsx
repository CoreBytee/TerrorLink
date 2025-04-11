import { GearFill, Headphones, MicFill } from "react-bootstrap-icons";
import Button from "../../components/Button/Button";
import "./Voice.css";
import Stripe from "../../components/Stripe/Stripe";
import { useState } from "react";

export function Voice() {
	const [muted, setMuted] = useState(false);

	return (
		<div className={"Voice"}>
			<canvas />
			<canvas />

			<div className="actionrow">
				<Button onClick={() => setMuted(!muted)}>
					<Stripe active={muted} />
					<MicFill size={40} />
				</Button>
				<Button>
					<Stripe active={muted} />
					<Headphones size={40} />
				</Button>
				<Button>
					<GearFill size={40} />
				</Button>
			</div>
		</div>
	);
}
