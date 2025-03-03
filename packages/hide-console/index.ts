let showConsole: () => void;
let hideConsole: () => void;

try {
	const ConsoleWindow = await import("node-hide-console-window");
	showConsole = ConsoleWindow.showConsole;
	hideConsole = ConsoleWindow.hideConsole;
} catch (error) {}

export function hideConsoleWindow() {
	if (hideConsole) {
		hideConsole();
	} else {
		console.error("Failed to hide console window");
	}
}

export function showConsoleWindow() {
	if (showConsole) {
		showConsole();
	} else {
		console.error("Failed to show console window");
	}
}
