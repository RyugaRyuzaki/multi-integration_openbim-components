"use client";
import React, { ReactNode, useEffect, useRef } from "react";
import { Button, Card, Tooltip } from "flowbite-react";

/**
 *	open model type
 * @param icon ReactNode?
 * @param onLoadModel callback function / detect when model is loaded!
 * @returns
 */
const OpenItem = ({
	icon,
	appType = "mapbox",
	onLoadModel,
}: {
	icon: any;
	appType: "mapbox" | "ArcGis";
	onLoadModel: (file: File, appType: "mapbox" | "ArcGis") => void;
}) => {
	const uploadAreaRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const onDragEnter = (e: any) => {
			e.preventDefault();
			// if (loadingSignal.value) return;
			uploadAreaRef.current?.classList.add("drag-over");
		};
		const onDragOver = (e: any) => {
			e.preventDefault();
		};
		const onDragLeave = () => {
			// if (loadingSignal.value) return;

			uploadAreaRef.current?.classList.remove("drag-over");
		};
		const onDrop = (e: any) => {
			e.preventDefault();
			// if (loadingSignal.value) return;

			uploadAreaRef.current?.classList.remove("drag-over");

			// get list files
			const files = e.dataTransfer?.files;

			if (files?.length) {
				const file = files[0] as File;
				onLoadModel(file, appType);
			}
		};
		// set drag event start
		uploadAreaRef.current?.addEventListener("dragenter", onDragEnter);
		/// drag even over the svg "cloud"
		uploadAreaRef.current?.addEventListener("dragover", onDragOver);
		/// drag even leave the svg "cloud"
		uploadAreaRef.current?.addEventListener("dragleave", onDragLeave);
		// when user drop a file
		uploadAreaRef.current?.addEventListener("drop", onDrop);
		return () => {
			if (!uploadAreaRef.current) return;
			// set drag event start
			uploadAreaRef.current?.removeEventListener("dragenter", onDragEnter);
			/// drag even over the svg "cloud"
			uploadAreaRef.current?.removeEventListener("dragover", onDragOver);
			/// drag even leave the svg "cloud"
			uploadAreaRef.current?.removeEventListener("dragleave", onDragLeave);
			// when user drop a file
			uploadAreaRef.current?.removeEventListener("drop", onDrop);
		};
	}, []);
	const handleLoadIfc = () => {
		const input = document.createElement("input");
		input.setAttribute("type", "file");
		input.setAttribute("accept", `.ifc`);
		input.click();
		input.onchange = async (e: any) => {
			const file = e.target?.files[0] as File;
			onLoadModel(file, appType);
		};
		input.remove();
	};

	return (
		<Card className="my-auto">
			<div className="h-[200px] w-[200px] border-1 rounded-3xl p-2 cursor-pointer" ref={uploadAreaRef}>
				<div className="text-9xl mb-2 ">{icon}</div>
				<Button
					// disabled={loadingSignal.value}
					gradientDuoTone="purpleToBlue"
					className="w-full m-auto my-2"
					onClick={handleLoadIfc}
				>
					Upload
				</Button>
			</div>
		</Card>
	);
};

export default OpenItem;
