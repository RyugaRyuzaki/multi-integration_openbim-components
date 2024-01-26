"use client";
import React from "react";
import { Modal } from "flowbite-react";
import { MdOutlineArchitecture } from "react-icons/md";
import { SiMapbox } from "react-icons/si";
import OpenItem from "./OpenItem";

/**
 * All features
 */
const features = [
	{
		icon: <SiMapbox className="h-[80%] w-[80%] m-auto fill-black stroke-black" />,
		appType: "mapbox",
	},

	{
		icon: <MdOutlineArchitecture className="h-[80%] w-[80%] m-auto fill-black stroke-black" />,
		appType: "ArcGis",
	},
];

/**
 * Body form
 * @param {imagesSrc}  IFileType
 * @param {handleLoadModel}  void
 * @param {handleLoadDB}  void
 * @param {handleDeleteDB}  void
 * @returns
 */
const FromOpenBody = ({ handleLoadModel }: { handleLoadModel: (file: File, appType: "mapbox" | "ArcGis") => void }) => {
	return (
		<>
			<div className="flex justify-center bg-slate-800 py-2">
				{features.map(({ icon, appType }, index: number) => (
					<div className="items-center mx-auto" key={`-${index}`}>
						<OpenItem
							icon={icon}
							// @ts-ignore
							appType={appType}
							onLoadModel={(file, appType) => handleLoadModel(file, appType)}
						/>
					</div>
				))}
			</div>
		</>
	);
};
/**
 * From open file, initialization
 * @param {openModal} boolean
 * @param {imagesSrc} IFileType
 * @param {handleLoadModel} void
 * @param {handleLoadDB} void
 * @param {handleDeleteDB} void
 * @returns
 */
const FromOpen = ({
	openModal,
	handleLoadModel,
}: {
	openModal: boolean;
	handleLoadModel: (file: File, appType: "mapbox" | "ArcGis") => void;
}) => {
	return (
		<>
			<Modal show={openModal} popup size="6xl">
				<Modal.Header />
				<Modal.Body>
					<div className="flex">
						<div className="flex-1">
							<FromOpenBody handleLoadModel={handleLoadModel} />
						</div>
					</div>
				</Modal.Body>
			</Modal>
		</>
	);
};
export default FromOpen;
