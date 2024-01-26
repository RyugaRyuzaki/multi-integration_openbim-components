import React from "react";
import ReactDOM from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<>
		{import.meta.env.PROD ? (
			<React.StrictMode>
				<App />
			</React.StrictMode>
		) : (
			<App />
		)}
	</>
);
