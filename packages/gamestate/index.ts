export type vector = {
	x: number;
	y: number;
	z: number;
};

export type position = vector;
export type velocity = vector;
export type angle = vector;

export type GameStateBody = {
	type: string;
	time: string;
	tick: number;
	data: GameStateData;
};

export type GameStateData = {
	map: string;
	round: number;
	round_phase: number;
	players: GameStatePlayer[];
};

export type GameStatePlayer = {
	steam_id: string;
	user_id: string;
	name: string;
	health: number;
	armor: number;
	is_bot: boolean;
	is_alive: boolean;
	is_walking: boolean;
	spectate_target: string;
	team: CSTeam;
	velocity: velocity;
	position: position;
	angle: angle;
};

export enum CSTeam {
	CounterTerrorist = 3,
	None = 0,
	Spectator = 1,
	Terrorist = 2,
}

export enum CSGamePhase {
	Warmup = 0,
	Standard = 1,
	FirstHalf = 2,
	SecondHalf = 3,
	HalfTime = 4,
	MatchEnded = 5,
	Max = 6,
}
