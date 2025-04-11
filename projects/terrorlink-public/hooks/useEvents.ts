import { useRef } from "react";
import Events from "../classes/Events";

export default function useEvents() {
	const events = useRef<Events | null>(null);

	if (!events.current) {
		events.current = new Events();
	}

	return events.current;
}
