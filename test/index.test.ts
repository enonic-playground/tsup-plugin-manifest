import type TsupPluginManifestOptions from '../src/TsupPluginManifestOptions.d';


import {
	beforeEach,
	describe,
	expect,
	test,
} from '@jest/globals';
import {
	existsSync,
	// readFileSync,
	// statSync,
	// utimesSync,
} from 'fs';
import { rimrafSync } from 'rimraf';
import TsupPluginManifest from '../src/index';


const DIR_SRC = 'test/src/main/resources';
const DIR_SRC_STATIC = `${DIR_SRC}/static`;

export const DIR_DST = 'test/build/resources/main';
const DIR_DST_STATIC = `${DIR_DST}/static`;


function buildOptions(pluginOptions: TsupPluginManifestOptions, overrideBuildOptions = {}) {
	const defaultBuildOptions = {
		bundle: true,
		entryPoints: {
			hello: `${DIR_SRC_STATIC}/hello.ts`,
		},
		outdir: DIR_DST_STATIC,
		// logLevel: 'silent',
		// logLimit: 0,
		plugins: [TsupPluginManifest(pluginOptions)],
	}

	return {...defaultBuildOptions, ...overrideBuildOptions};
};


describe('TsupPluginManifest', () => {
	beforeEach(() => {
		rimrafSync('test/build');
	});

	test('it returns a valid esbuild plugin interface', () => {
		const plugin = TsupPluginManifest({});
		expect(plugin).toHaveProperty('name');
		expect(plugin).toHaveProperty('setup');
		expect(plugin.name).toBe('tsup-plugin-manifest');
	});

	test('handles custom generate function', async () => {
		await require('esbuild').build(buildOptions({
			generate: (entries) => {
				Object.entries(entries).forEach(([k,v]) => {
					const ext = v.split('.').pop() as string;
					const parts = k.replace(`${DIR_SRC_STATIC}/`, '').split('.');
					parts.pop();
					parts.push(ext);
					entries[parts.join('.')] = v.replace(`${DIR_DST_STATIC}/`, '');
				});
				return entries;
			}
		}, {
			define: {
				TSUP_FORMAT: '"esm"'
			}
		}));
		expect(existsSync(`${DIR_DST_STATIC}/manifest.esm.json`)).toBe(true);
	});
}); // TsupPluginManifest
