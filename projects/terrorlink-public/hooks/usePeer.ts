import Peer from "peerjs";
import { useRef } from "react";

export default function usePeer() {
	const peer = useRef<Peer | null>(null);

	if (!peer.current) {
		peer.current = new Peer();
	}

	return peer.current;
}
