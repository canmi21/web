<script lang="ts">
	/**
	 * One node of a Markdown syntax tree, drawn with the design's tokens, and its children through
	 * this same component. A directive is drawn by the component registered under its name; one
	 * nobody registered is shown as its name, so it is seen rather than lost.
	 */
	import * as stylex from '@stylexjs/stylex';
	import type { Nodes } from 'mdast';
	import type { Directives } from './directives.ts';
	// oxlint-disable-next-line import/no-self-import -- a node's children are nodes, drawn by this
	import Self from './node.svelte';
	import { styles } from './styles.ts';

	let { node, directives }: { node: Nodes; directives: Directives } = $props();
</script>

{#snippet children(parent: Nodes)}
	{#if 'children' in parent}
		{#each parent.children as child, index (index)}<Self node={child} {directives} />{/each}
	{/if}
{/snippet}

{#if node.type === 'root'}
	{@render children(node)}
{:else if node.type === 'paragraph'}
	<p>{@render children(node)}</p>
{:else if node.type === 'heading'}
	{#if node.depth <= 2}
		<h2 class={stylex.attrs(styles.h2).class}>{@render children(node)}</h2>
	{:else}
		<h3 class={stylex.attrs(styles.h3).class}>{@render children(node)}</h3>
	{/if}
{:else if node.type === 'text'}
	{node.value}
{:else if node.type === 'emphasis'}
	<em>{@render children(node)}</em>
{:else if node.type === 'strong'}
	<strong class={stylex.attrs(styles.strong).class}>{@render children(node)}</strong>
{:else if node.type === 'delete'}
	<del>{@render children(node)}</del>
{:else if node.type === 'inlineCode'}
	<code class={stylex.attrs(styles.code).class}>{node.value}</code>
{:else if node.type === 'code'}
	<pre class={stylex.attrs(styles.block).class}><code>{node.value}</code></pre>
{:else if node.type === 'link'}
	<a href={node.url} class={stylex.attrs(styles.link).class}>{@render children(node)}</a>
{:else if node.type === 'list'}
	{#if node.ordered}
		<ol class={stylex.attrs(styles.list, styles.numbers).class}>{@render children(node)}</ol>
	{:else}
		<ul class={stylex.attrs(styles.list, styles.bullets).class}>{@render children(node)}</ul>
	{/if}
{:else if node.type === 'listItem'}
	<li class={stylex.attrs(styles.item).class}>
		{#each node.children as child, index (index)}
			{#if child.type === 'paragraph'}{@render children(child)}{:else}<Self
					node={child}
					{directives}
				/>{/if}
		{/each}
	</li>
{:else if node.type === 'blockquote'}
	<blockquote class={stylex.attrs(styles.quote).class}>{@render children(node)}</blockquote>
{:else if node.type === 'thematicBreak'}
	<hr class={stylex.attrs(styles.rule).class} />
{:else if node.type === 'break'}
	<br />
{:else if node.type === 'table'}
	<div class={stylex.attrs(styles.tableBox).class}>
		<table class={stylex.attrs(styles.table).class}>
			<tbody>
				{#each node.children as row, rowIndex (rowIndex)}
					<tr>
						{#each row.children as cell, cellIndex (cellIndex)}
							{#if rowIndex === 0}
								<th class={stylex.attrs(styles.cell, styles.head).class}
									>{@render children(cell)}</th
								>
							{:else}
								<td class={stylex.attrs(styles.cell).class}>{@render children(cell)}</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else if node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective'}
	{@const Drawn = directives[node.name]}
	{#if Drawn}
		<Drawn {node} />
	{:else}
		<span class={stylex.attrs(styles.unknown).class}>{node.name}</span>
	{/if}
{/if}
