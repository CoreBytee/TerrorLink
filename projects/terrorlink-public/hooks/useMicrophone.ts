import { useRef } from "react";
import Microphone from "../classes/Microphone";

export default function useMicrophone() {
	const microphone = useRef<Microphone | null>(null);

	if (!microphone.current) {
		microphone.current = new Microphone();
	}

	return microphone.current;
}
