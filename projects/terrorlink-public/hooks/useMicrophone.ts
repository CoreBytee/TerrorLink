import { useRef } from "react";
import Microphone from "../classes/Microphone";

let microphone: Microphone | null = null;

export default function useMicrophone() {
	if (!microphone) {
		microphone = new Microphone();
	}

	return microphone;
}
