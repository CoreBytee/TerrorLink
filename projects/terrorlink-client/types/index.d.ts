declare module "*.gif" {
	const value: string;
	export default value;
}

declare module "node-web-audio-api" {
	export const mediaDevices: Pick<
		Navigator["mediaDevices"],
		"enumerateDevices" | "getUserMedia"
	>;
}
