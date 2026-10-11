import type { Plugin } from 'vite';

/**
 * StyleX's development sheet at `{base}/virtual:stylex.css`, where a part's head links it and its
 * runtime fetches it: the plugin answers, and its runtime asks, only at the root, which on
 * canmi.app is the router's, not the part's. Listed before StyleX's plugin, so its middleware sees
 * the path first. See spec/architecture/space.md.
 */
export function stylexUnderBase(base: string): Plugin {
	const path = `${base}/virtual:stylex.css`;
	return {
		name: 'stylex-under-base',
		apply: 'serve',
		transform(code, id) {
			if (!id.includes('virtual:stylex:runtime')) return null;
			return code.replace("'/virtual:stylex.css'", JSON.stringify(path));
		},
		configureServer(server) {
			server.middlewares.use((request, _response, next) => {
				if (request.url?.startsWith(path)) request.url = request.url.slice(base.length);
				next();
			});
		},
	};
}
