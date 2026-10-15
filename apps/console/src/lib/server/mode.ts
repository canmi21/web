/**
 * Which data development draws: the real nodes, through their remote bindings, or made-up data
 * with no node reached, `mise run //repos/web:dev-console-mock`. Stated by vite.config.ts while
 * serving; absent from a build and from tests, which read the real nodes' shape. See
 * spec/architecture/console.md, "Developing it reads the real nodes".
 */
declare const CONSOLE_MOCK: boolean | undefined;

/**
 * Whether mock mode is on: only in development, whatever was stated. Vite writes
 * `import.meta.env.DEV` as `false` into a production build, so a build is never mocked, and never
 * writes as the made-up `developer` ./api.ts writes as there, even were `CONSOLE_MOCK` defined.
 */
export const mockedIn = (development: boolean, stated: unknown): boolean =>
	development && stated === true;

export const MOCKED = mockedIn(
	import.meta.env.DEV,
	typeof CONSOLE_MOCK === 'boolean' ? CONSOLE_MOCK : undefined,
);

/** Whether `CONSOLE_WRITES=1` was stated to `vite dev`; see vite.config.ts. */
declare const CONSOLE_WRITES: boolean | undefined;

/**
 * Whether a write reaches control: always from a build, and in development only where it was
 * stated, since `vite dev`'s remote `CONTROL` binding is the real control. See wrangler.jsonc.
 */
export const writesIn = (development: boolean, stated: unknown): boolean =>
	!development || stated === true;

export const WRITES = writesIn(
	import.meta.env.DEV,
	typeof CONSOLE_WRITES === 'boolean' ? CONSOLE_WRITES : undefined,
);
