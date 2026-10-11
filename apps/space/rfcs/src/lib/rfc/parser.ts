/**
 * What an RFC's body is read with: CommonMark and GFM, and nothing of the corpus's, so a directive
 * written by habit is text. See RFC ejy85.
 */
import type { Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const parser = unified().use(remarkParse).use(remarkGfm);

export const syntaxTree = (markdown: string): Root => parser.parse(markdown) as Root;
