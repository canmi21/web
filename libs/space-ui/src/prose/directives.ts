import type { Component } from 'svelte';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';

/** A directive's component by its name: `::name`, `:::name` or `:name`, given the node itself. */
export type Directives = Record<
	string,
	Component<{ node: ContainerDirective | LeafDirective | TextDirective }>
>;
