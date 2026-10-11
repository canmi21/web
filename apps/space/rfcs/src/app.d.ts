/// <reference types="@cloudflare/workers-types" />

import type { BuildEnv } from '@canmi/web/build';
import type { Stamped } from '@canmi/web/error';

declare global {
	/** The build's commit, moment and disclosure; see vite.config.ts. */
	interface ImportMetaEnv extends BuildEnv {}

	namespace App {
		/** Which side failed, absent where nothing did; see lib's spec/web/error.md. */
		interface Error extends Stamped {
			message: string;
		}
	}

	namespace Cloudflare {
		interface Env {
			/** The adapter's own: the client files and the prerendered pages. */
			ASSETS: Fetcher;
		}
	}
}

export {};
