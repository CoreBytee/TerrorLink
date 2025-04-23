import { useRef } from "react";
import Speaker from "../classes/Speaker";

let speaker: Speaker | null = null;

export default function useSpeaker() {
	if (!speaker) {
		speaker = new Speaker();
	}

	return speaker;
}
