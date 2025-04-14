import { useEffect, useState } from "react";
import Button from "../../components/Button/Button";
import "./PlayerSettings.css";
import useSpeaker from "../../hooks/useSpeaker";

export function PlayerSettings({
	peerId,
	steamId,
	name,
	onReturn,
}: {
	peerId: string;
	steamId: string;
	name: string;
	onReturn: () => void;
}) {
	const speaker = useSpeaker();

	const [volume, setVolume] = useState<number | null>(null);

	useEffect(() => {
		if (volume !== null) return;
		setVolume(
			Number.parseInt(localStorage.getItem(`playervolume-${steamId}`) ?? "100"),
		);
	});

	function onVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
		const newVolume = Number.parseInt(event.target.value);
		setVolume(newVolume);
		localStorage.setItem(`playervolume-${steamId}`, newVolume.toString());
		speaker.setChannelVolume(peerId, newVolume / 100);
	}

	return (
		<div className={"PlayerSettings"}>
			<p>Settings for the player {name}</p>
			<label htmlFor="playervolume">Volume: {volume}%</label>
			<input
				id="playervolume"
				type="range"
				min={0}
				max={300}
				value={volume ?? 0}
				onChange={onVolumeChange}
			/>
			<Button onClick={onReturn}>Return</Button>
		</div>
	);
}
