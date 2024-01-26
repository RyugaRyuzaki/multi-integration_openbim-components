import React, { useEffect, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import { FromOpen } from "./components";
import { BimModel } from "./BimModel";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
function App() {
	const rootContainerRef = useRef<HTMLDivElement | null>(null);
	const [openModal, setOpenModel] = useState<boolean>(true);
	const [bimModel, setBimModel] = useState<BimModel | null>(null);
	useEffect(() => {
		const model = new BimModel(rootContainerRef.current!);
		setBimModel(model);
		return () => {
			model?.dispose();
			setBimModel(null);
			setOpenModel(true);
		};
	}, []);
	const handleLoadModel = (file: File, appType: "mapbox" | "ArcGis") => {
		setOpenModel(false);
		bimModel?.setAppType(file, appType);
	};
	return (
		<>
			<div className="relative h-full w-full overflow-hidden pointer-events-auto" ref={rootContainerRef}></div>
			<FromOpen openModal={openModal} handleLoadModel={handleLoadModel} />
			<ToastContainer
				position="top-right"
				autoClose={1000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				draggable
				theme="light"
			/>
		</>
	);
}

export default App;
