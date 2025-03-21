declare module "node-web-audio-api" {
	export const mediaDevices: Pick<
		Navigator["mediaDevices"],
		"enumerateDevices" | "getUserMedia"
	>;
}
