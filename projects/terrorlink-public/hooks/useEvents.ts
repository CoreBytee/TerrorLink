import { useRef } from "react";
import Events from "../classes/Events";

let events: Events | null = null;

export default function useEvents() {
	if (!events) {
		events = new Events();
	}

	return events;
}
