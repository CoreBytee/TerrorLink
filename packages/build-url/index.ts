export default function buildUrl(
	protocol: "ws" | "http",
	port?: number,
	secure = true,
	host = "terrorlink.corebyte.me",
) {
	if (port === undefined) secure = true;
	if ((port === 443 || port === undefined) && secure) {
		return `${protocol}s://${host}`;
	}

	if ((port === 80 || port === undefined) && !secure) {
		return `${protocol}://${host}`;
	}

	return `${protocol}${secure ? "s" : ""}://${host}:${port}`;
}
