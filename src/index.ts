import type {
	BuildResult,
	Metafile,
	Plugin,
	PluginBuild
} from 'esbuild';
import type { TsupPluginManifestOptions } from './index.d';


import {
	existsSync,
	mkdirSync,
	promises,
	statSync
} from 'fs';
import {
	basename,
	dirname,
	parse,
	resolve,
} from 'path';
import { TextEncoder } from 'util';
// import {
// 	createLogger,
// 	setSilent
// } from './log';
// import { reportSize } from './reportSize';


const PLUGIN_NAME = 'tsup-plugin-manifest';


const findSiblingCssFile = (metafile: Metafile, outputFilename: string): {input: string, output: string}|undefined => {
	if (!outputFilename.endsWith('.js')) {
		return;
	}

	// we need to determine the difference in filenames between the input and output of the entrypoint, so that we can
	// use that same logic to match against a potential sibling file
	const entry = metafile.outputs[outputFilename]!.entryPoint!;

	// "example.js" => "example"
	const entryWithoutExtension = parse(entry).name;

	// "example-GQI5TWWV.js" => "example-GQI5TWWV"
	const outputWithoutExtension = basename(outputFilename).replace(/\.js$/, '');

	// "example-GQI5TWWV" => "-GQI5TWWV"
	const diff = outputWithoutExtension.replace(entryWithoutExtension, '');

	// esbuild uses [A-Z0-9]{8} as the hash, and that is not currently configurable so we should be able
	// to match that exactly in the diff and replace it with the regex so we're left with:
	// "-GQI5TWWV" => "-[A-Z0-9]{8}"
	const hashRegex = new RegExp(diff.replace(/[A-Z0-9]{8}/, '[A-Z0-9]{8}'));

	// the sibling entry is expected to be the same name as the entrypoint just with a css extension
	const potentialSiblingEntry = parse(entry).dir + '/' + parse(entry).name + '.css';

	const potentialSiblingOutput = outputFilename.replace(hashRegex, '').replace(/\.js$/, '.css');

	const found = Object.keys(metafile.outputs).find(output => output.replace(hashRegex, '') === potentialSiblingOutput);

	return found ? { input: potentialSiblingEntry, output: found } : undefined;
};



const fromEntries = (map: Map<string, string>): {[key: string]: string} => {
	return Array.from(map).reduce((obj: {[key: string]: string}, [key, value]) => {
		obj[key] = value;
		return obj;
	}, {});
};


export = (options: TsupPluginManifestOptions): Plugin => ({
	name: PLUGIN_NAME,
	setup(build: PluginBuild) {
		build.initialOptions.entryNames = '[dir]/[name]-[hash]';
		build.initialOptions.metafile = true;
		const {
			// absWorkingDir = process.cwd(),
			outdir,
			outfile,
			// logLevel,
			write: shouldWrite = true
		} = build.initialOptions;
		// setSilent(logLevel === 'silent');

		build.onEnd((result: BuildResult) => {
			// Only proceed if the build result does not have any errors.
			if (result.errors.length > 0) {
				return;
			}

			if (!result.metafile) {
				throw new Error("Expected metafile, but it does not exist.");
			}

			const format = build.initialOptions.define?.['TSUP_FORMAT'].replace(/"/g,'')//.toUpperCase();
			if (!format) throw new Error('TSUP_FORMAT not defined');

			if (outdir === undefined && outfile === undefined) {
				throw new Error("You must specify an 'outdir' when generating a manifest file.");
			}

			const mappings = new Map<string, string>();
			const addMapping = (inputFilename: string, outputFilename: string) => {
				if (mappings.has(inputFilename)) {
					throw new Error(`There is a conflicting manifest key for "${inputFilename}".`);
				}
				mappings.set(inputFilename, outputFilename);
			};

			for (const outputFilename in result.metafile.outputs) {
				const outputInfo = result.metafile.outputs[outputFilename]!;

				// skip all outputs that don't have an entrypoint
				if (!outputInfo.entryPoint) {
					continue;
				}

				addMapping(outputInfo.entryPoint, outputFilename);
				// Check if this entrypoint has a "sibling" css file
				// When esbuild encounters js files that import css files, it will gather all the css files referenced from the
				// entrypoint and bundle it into a single sibling css file that follows the same naming structure as the entrypoint.
				// So what we can do is simply check the outputs for a sibling file that matches the naming structure.
				const siblingCssFile = findSiblingCssFile(result.metafile, outputFilename);

				if (siblingCssFile !== undefined) {
					addMapping(siblingCssFile.input, siblingCssFile.output);
				}
			} // for

			const filename = `manifest.${format}.json`;
			const finalOutdir = outdir || dirname(outfile!);

			if (!existsSync(finalOutdir) || !statSync(finalOutdir).isDirectory()) {
				mkdirSync(finalOutdir, { recursive: true });
			}

			const fullPath = resolve(`${finalOutdir}/${filename}`);

			// const logger = createLogger(PLUGIN_NAME);
			const {
				generate
			} = options;

			const entries = fromEntries(mappings);

			const resultObj = generate ? generate(entries) : entries;

			const text = JSON.stringify(resultObj, null, 2);

			// With the esbuild write=false option, nothing will be written to disk. Instead, the build
			// result will have an "outputFiles" property containing all the files that would have been written.
			// We want to add the manifest file as one of those "outputFiles".
			if (!shouldWrite) {
				result.outputFiles?.push({
					path: fullPath,
					contents: new TextEncoder().encode(text),
					get text() {
						return text;
					}
				});
				return;
			}
			// reportSize(logger, format, { fullPath: statSync(fullPath).size });
			return promises.writeFile(fullPath, text);
		}); // onEnd
	} // setup
}); // export
