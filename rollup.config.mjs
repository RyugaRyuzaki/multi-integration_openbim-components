import { nodeResolve } from "@rollup/plugin-node-resolve";
import extensions from "./rollup-extensions.mjs";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";
// This creates the bundle used by the examples
//https://github.com/IFCjs/fragment/blob/main/resources/rollup.config.mjs

const plugins = [
	extensions({
		extensions: [".js"],
	}),
	nodeResolve(),
	commonjs(),
	typescript({
		tsconfig: "tsconfig.rollup.json",
	}),
	json(),
];
const configInput1 = {
	input: "worker/Geometry/IfcGeometryWorker.ts",
	output: {
		file: "public/IfcGeometryWorker.js",
		format: "esm",
	},
	plugins,
};

const configInput2 = {
	input: "worker/Property/IfcPropertyWorker.ts",
	output: {
		file: "public/IfcPropertyWorker.js",
		format: "esm",
	},
	plugins,
};

export default [configInput1, configInput2];
