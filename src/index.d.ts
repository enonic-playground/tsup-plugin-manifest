export interface TsupPluginManifestOptions {
	generate?: (entries: {[key: string]: string}) => Object;
}
