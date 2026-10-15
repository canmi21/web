/**
 * What the console reads of the platform's control plane and writes to it: a resource of a kind
 * as control answers it, a node's drift as its host does, a task and its events as the ledger
 * does, and what a write comes back with. The catalog's types are generated, ./catalog.gen.ts; the
 * rest are written here until their producers commit a schema to generate them from, RFC bq3vn.
 * See platform's RFC cpc2b and spec/console/navigation.md.
 */
import type { Kind } from './catalog.gen.ts';

/** Why a read or a write did not answer: the envelope's code, or one the console gave it. */
export interface Failure {
	status: number;
	/** The producer's own code, which may be newer than the console's catalog of them. */
	code: string;
	message: string;
}

/** What the console's control reads answer: the data, or why there is none. */
export type Control<T> = { ok: true; data: T } | { ok: false; failure: Failure };

/** What a person writes of a resource: its `spec`, whatever its kind holds. */
export type Spec = { [key: string]: unknown };

/** A resource of a kind, as `/v1/<plural>/<id>` answers it. */
export interface Resource {
	kind: Kind;
	/** 16 lowercase hexadecimal digits, never changed; the name is a label. A node's is its key. */
	id: string;
	/** Null for a kind the catalog marks `named: false`, a node's and an account's: it is its id. */
	name: string | null;
	/** The change that last wrote it, which a write of it carries back. */
	revision: number;
	spec: Spec;
	/** What is, written by a controller; absent until a kind's controller writes one. */
	status?: { [key: string]: unknown };
	/** What the platform found to differ, drawn and never computed here. */
	drift?: unknown;
}

/** Every resource of a kind, and the newest change control holds. */
export interface List {
	items: Resource[];
	revision: number;
}

/** A run, and its commit where host knows it. */
export interface Ran {
	run: number;
	commit?: string;
}

/** An app running another release than the one wanted, `running` absent where host has no run. */
export interface Behind {
	app: string;
	wanted: Ran;
	running?: Ran;
}

/**
 * A node's host's `/api/drift`: what control wants there and does not run, what runs and is not
 * wanted, and what runs another release; each absent when empty. Infra's
 * spec/architecture/host.md, "host compares what runs with what control wants".
 */
export interface Drift {
	wanted_not_running?: string[];
	running_not_wanted?: string[];
	release_behind?: Behind[];
	/** Control's revision, under the name host has always answered it by. */
	registry_revision: number;
	/** RFC 3339. */
	read_at: string;
	/** Control this round, or the record host kept when it did not answer. */
	source: 'control' | 'cache';
}

export type TaskState = 'queued' | 'running' | 'done' | 'failed';

/** A task as the ledger keeps it; times are RFC 3339. Platform's spec/architecture/ledger.md. */
export interface Task {
	service: string;
	id: string;
	kind: string;
	state: TaskState;
	caller: 'public' | 'ours';
	parent?: { service: string; id: string };
	asked_at: string;
	started_at?: string;
	finished_at?: string;
	/** A small object the service chooses; null where it chose none. */
	summary: unknown;
	detail?: string;
	updated_at: string;
}

/** A task in a list, with where the next page starts after it. */
export interface Listed extends Task {
	cursor: string;
}

/** One step of a task. */
export interface TaskEvent {
	service: string;
	task: string;
	/** Nanoseconds, past what a JavaScript number holds exactly: order by the list, never this. */
	seq: number;
	at: string;
	stage: string;
	level: 'info' | 'warn' | 'error';
	message: string;
	data?: unknown;
}

/** A task, its events in order, and the tasks it is the parent of, newest first. */
export interface TaskDetail extends Task {
	events: TaskEvent[];
	children: Task[];
}

/** A page of tasks, newest first; `next` is the `before` of the page after, absent at the end. */
export interface TaskPage {
	items: Listed[];
	next?: string;
}

/** What `GET /tasks` narrows by, each matched exactly; a type, so it reads as a query's strings. */
export type TaskQuery = {
	service?: string;
	state?: string;
	kind?: string;
	caller?: string;
	/** `service:id` of the task that asked. */
	parent?: string;
	before?: string;
	limit?: string;
};

/**
 * A write's outcome: the revision it made, with the id control drew for one made with no name;
 * nothing to change; or control's refusal.
 */
export type Written =
	| { ok: true; revision: number; id?: string }
	| { ok: true; unchanged: true }
	| { ok: false; failure: Failure };

/** Creating a resource at revision 0: a named kind's by its name, any other with none. */
export interface Create {
	kind: Kind;
	name?: string;
	spec: Spec;
}

/** Changing a resource by its id or name, held to the revision read; a `null` takes a key out. */
export interface Patch {
	kind: Kind;
	ref: string;
	revision: number;
	patch: Spec;
}
