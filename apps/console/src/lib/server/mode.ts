/**
 * Which data development draws: the real nodes, through their remote bindings, or made-up data
 * with no node reached, `mise run //repos/web:dev-console-mock`. Stated by vite.config.ts while
 * serving; absent from a build and from tests, which read the real nodes' shape. See
 * spec/architecture/console.md, "Developing it reads the real nodes".
 */
declare const CONSOLE_MOCK: boolean | undefined;

export const MOCKED = typeof CONSOLE_MOCK === 'boolean' && CONSOLE_MOCK;
