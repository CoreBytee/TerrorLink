import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import App from "./components/App/App";

const rootNode = document.getElementById("root")!;
const app = (
	<StrictMode>
		<App />
	</StrictMode>
);
const root = import.meta.hot
	? (import.meta.hot.data.root ?? createRoot(rootNode))
	: createRoot(rootNode);

if (import.meta.hot) {
	import.meta.hot.data.root = root;
}

root.render(app);
