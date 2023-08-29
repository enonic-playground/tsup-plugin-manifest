export default interface TsupPluginManifestOptions {
	generate?: (entries: Record<string,string>) => Record<string,string>;
}
