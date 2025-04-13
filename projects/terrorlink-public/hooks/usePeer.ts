import Peer from "peerjs";
import { useRef } from "react";

let peer: Peer | null = null;

export default function usePeer() {
	if (!peer) {
		peer = new Peer();
	}

	return peer;
}
