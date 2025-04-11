import { useRef } from "react";
import Speaker from "../classes/Speaker";

export default function useSpeaker() {
	const speaker = useRef<Speaker | null>(null);

	if (!speaker.current) {
		speaker.current = new Speaker();
	}

	return speaker.current;
}
