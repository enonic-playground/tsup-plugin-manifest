import type TsupPluginManifestOptions from '../src/TsupPluginManifestOptions.d';


import {
	beforeEach,
	describe,
	expect,
	test,
} from '@jest/globals';
import {
	existsSync,
} from 'fs';
import { resolve } from 'path';
//@ts-ignore
// import { print } from 'q-i';
import { rimrafSync } from 'rimraf';
import TsupPluginManifest from '../src/index';


const DIR_SRC = 'test/src/main/resources';
const DIR_SRC_STATIC = `${DIR_SRC}/static`;

export const DIR_DST = 'test/build/resources/main';
const DIR_DST_STATIC = `${DIR_DST}/static`;


function buildOptions(pluginOptions: TsupPluginManifestOptions, overrideBuildOptions = {}) {
	const defaultBuildOptions = {
		bundle: true,
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
				const newEntries = {} as typeof entries;
				Object.entries(entries).forEach(([k,v]) => {
					const ext = v.split('.').pop() as string;
					const parts = k.replace(`${DIR_SRC_STATIC}/`, '').split('.');
					parts.pop();
					parts.push(ext);
					newEntries[parts.join('.')] = v.replace(`${DIR_DST_STATIC}/`, '');
				});
				return newEntries;
			}
		}, {
			define: {
				TSUP_FORMAT: '"esm"'
			},
			entryPoints: {
				hello: `${DIR_SRC_STATIC}/hello.ts`,
			},
			outdir: DIR_DST_STATIC,
		}));
		expect(existsSync(`${DIR_DST_STATIC}/manifest.esm.json`)).toBe(true);
	});

	test('it should throw an error if building without TSUP_FORMAT', async () => {
		expect.assertions(1);
		try {
			await require('esbuild').build(buildOptions({}));
		} catch (e: unknown) {
			expect((e as Error).message).toMatch('TSUP_FORMAT not defined!');
		}
	});

	test('it should throw an error if building without an outdir or outfile', async () => {
		expect.assertions(1);
		try {
			await require('esbuild').build(buildOptions({}, {
				define: {
					TSUP_FORMAT: '"esm"'
				},
				outdir: undefined,
				outfile: undefined
			}));
		} catch (e: unknown) {
			expect((e as Error).message).toMatch("You must specify an 'outdir' when generating a manifest file!");
		}
	});

	test('it should throw an error when there are conflicting manifest keys', async () => {
		expect.assertions(1);
		try {
			await require('esbuild').build(buildOptions({}, {
				define: {
					TSUP_FORMAT: '"esm"'
				},
				entryPoints: {
					hello: `${DIR_SRC_STATIC}/hello.ts`,
					hello2: `${DIR_SRC_STATIC}/hello.ts`,
				},
				outdir: 'test/build'
			}));
		} catch (e: unknown) {
			expect((e as Error).message).toMatch(/There is a conflicting manifest key for/);
		}
	});

	test('it should only generate the manifest when the build result contains no errors', async () => {
		try {
			await require('esbuild').build(buildOptions({}, {
				define: {
					TSUP_FORMAT: '"esm"'
				},
				entryPoints: ['test/input/withError.ts'],
				logLevel: 'silent',
				outdir: 'test/build'
			}));
		} catch (e: unknown) {
			expect((e as {errors: Error[]}).errors.length).toBe(1);
		}
		expect(existsSync('test/build/manifest.esm.json')).toBe(false);
	});

	test('it should include the manifest file as part of the build result output files with the esbuild write=false option', async () => {
		const result = await require('esbuild').build(buildOptions({}, {
			define: {
				TSUP_FORMAT: '"esm"'
			},
			entryPoints: ['test/input/noImports.ts'],
			outdir: 'test/build',
			write: false
		}));
		expect(result.outputFiles[1].path).toBe(resolve('test/build/manifest.esm.json'));
		expect(result.outputFiles[1].contents).toStrictEqual(new TextEncoder().encode(result.outputFiles[1].text));
	});

	test('it should not throw an error with esbuild write=false option', async () => {
		await require('esbuild').build(buildOptions({}, {
			define: {
				TSUP_FORMAT: '"esm"'
			},
			entryPoints: ['test/input/noImports.ts'],
			outdir: 'test/build',
			write: false
		}));
		expect(existsSync('test/build/manifest.esm.json')).toBe(false);
	});

	test('handles images', async () => {
		await require('esbuild').build(buildOptions({}, {
			define: {
				TSUP_FORMAT: '"esm"'
			},
			// entryPoints: ['test/input/withImage.ts'],
			entryPoints: ['test/input/Example.jpg'],
			loader: {
				// '.jpg': 'file'
				'.jpg': 'base64'
			},
			outdir: 'test/build',
		}));
		expect(existsSync('test/build/manifest.esm.json')).toBe(true);
	});

}); // TsupPluginManifest
