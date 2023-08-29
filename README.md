# tsup-plugin-manifest

## Installation

```sh
npm install --save-dev @enonic/tsup-plugin-manifest
```

```sh
yarn add --dev @enonic/tsup-plugin-manifest
```

```sh
pnpm add --save-dev @enonic/tsup-plugin-manifest
```


## Usage

```ts
import TsupPluginManifest from '@enonic/tsup-plugin-manifest';

export default defineConfig((options) => {
	return {
		// ...
		esbuildPlugins: [
			TsupPluginManifest({
				// Manipulate the manifest keys and values.
				generate: (entries) => {
					const newEntries = {} as typeof entries;
					Object.entries(entries).forEach(([k,v]) => {
						// console.log(k,v);
						const ext = v.split('.').pop() as string;
						const parts = k.replace(`${SOME_DIR}/`, '').split('.');
						parts.pop();
						parts.push(ext);
						newEntries[parts.join('.')] = v.replace(`${SOME_DIR}/`, '');
					});
					return newEntries;
				}
			})
		],
		format: [
			'cjs', // Legacy browser support, also css in manifest.cjs.json
			'esm', // cjs needed because css files are not reported in manifest.esm.json
		],
		// ...
	}
}
```

## Options

### `options?.generate`

Type: `(entries: Record<string,string>) => Record<string,string>`

Callback used to manipulate the content of the produced manifest file.

## License

MIT
