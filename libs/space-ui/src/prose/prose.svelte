<script lang="ts">
	/**
	 * A Markdown document, already parsed, drawn with the design's tokens: the corpus's syntax and
	 * nothing of the site's styles. A directive is drawn by the component its name is registered
	 * under. See spec/architecture/space.md.
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Root } from 'mdast';
	import type { Directives } from './directives.ts';
	import Node from './node.svelte';
	import { styles } from './styles.ts';

	let { tree, directives = {} }: { tree: Root; directives?: Directives } = $props();
</script>

<div class={stylex.attrs(styles.root).class}>
	<Node node={tree} {directives} />
</div>
