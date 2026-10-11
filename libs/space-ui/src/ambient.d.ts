/**
 * What the bundler supplies and a type checker does not. No `export`, so every declaration stays
 * global, as libs/prose's are.
 */

interface ImportMetaEnv {
	/** What the app is made of, set by the app's build; see lib's spec/web/disclose.md. */
	readonly VITE_DISCLOSURE: import('@canmi/web/build').BuildEnv['VITE_DISCLOSURE'];
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

/** StyleX's hot updates, served by its plugin; see spec/architecture/css/layers.md. */
declare module 'virtual:stylex:runtime' {}
