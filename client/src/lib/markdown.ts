import { createElement, type ReactNode } from 'react';

/**
 * Simple markdown parser for chat messages.
 * Supports: **bold**, *italic*, `inline code`, ```code blocks```,
 * ~~strikethrough~~, __underline__, ||spoiler||, links, and line breaks.
 *
 * Returns an array of React elements (no dangerouslySetInnerHTML).
 */

interface Token {
  type: 'text' | 'bold' | 'italic' | 'code' | 'codeblock' | 'strikethrough' | 'underline' | 'spoiler' | 'link' | 'br';
  content: string;
  href?: string;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Code block: ```...```
    const codeBlockMatch = remaining.match(/^```(?:\w*\n)?([\s\S]*?)```/);
    if (codeBlockMatch) {
      tokens.push({ type: 'codeblock', content: codeBlockMatch[1] });
      remaining = remaining.slice(codeBlockMatch[0].length);
      continue;
    }

    // Inline code: `...`
    const codeMatch = remaining.match(/^`([^`\n]+)`/);
    if (codeMatch) {
      tokens.push({ type: 'code', content: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Spoiler: ||...||
    const spoilerMatch = remaining.match(/^\|\|([^|]+)\|\|/);
    if (spoilerMatch) {
      tokens.push({ type: 'spoiler', content: spoilerMatch[1] });
      remaining = remaining.slice(spoilerMatch[0].length);
      continue;
    }

    // Bold: **...**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: 'bold', content: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Underline: __...__
    const underlineMatch = remaining.match(/^__(.+?)__/);
    if (underlineMatch) {
      tokens.push({ type: 'underline', content: underlineMatch[1] });
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // Strikethrough: ~~...~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      tokens.push({ type: 'strikethrough', content: strikeMatch[1] });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Italic: *...* or _..._
    const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      tokens.push({ type: 'italic', content: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // URL
    const urlMatch = remaining.match(/^https?:\/\/[^\s<>[\]()]+/);
    if (urlMatch) {
      tokens.push({ type: 'link', content: urlMatch[0], href: urlMatch[0] });
      remaining = remaining.slice(urlMatch[0].length);
      continue;
    }

    // Line break
    if (remaining.startsWith('\n')) {
      tokens.push({ type: 'br', content: '' });
      remaining = remaining.slice(1);
      continue;
    }

    // Plain text: consume until the next special character
    const nextSpecial = remaining.search(/[*_`~|\n]|https?:\/\//);
    if (nextSpecial === -1) {
      tokens.push({ type: 'text', content: remaining });
      remaining = '';
    } else if (nextSpecial === 0) {
      // The special character didn't match any pattern; consume it as text
      tokens.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      tokens.push({ type: 'text', content: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

/**
 * Parses a markdown string into an array of React elements.
 */
export function parseMarkdown(text: string): ReactNode[] {
  const tokens = tokenize(text);
  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return createElement('strong', { key: i }, token.content);

      case 'italic':
        return createElement('em', { key: i }, token.content);

      case 'code':
        return createElement(
          'code',
          {
            key: i,
            style: {
              backgroundColor: 'var(--bg-code)',
              padding: '0.1em 0.3em',
              borderRadius: '3px',
              fontSize: '0.875em',
              fontFamily: 'monospace',
            },
          },
          token.content
        );

      case 'codeblock':
        return createElement(
          'pre',
          {
            key: i,
            style: {
              backgroundColor: 'var(--bg-code)',
              padding: '0.5em',
              borderRadius: '4px',
              overflow: 'auto',
              margin: '4px 0',
              fontSize: '0.875em',
              fontFamily: 'monospace',
              lineHeight: '1.125rem',
              border: '1px solid var(--border-subtle)',
            },
          },
          createElement('code', null, token.content)
        );

      case 'strikethrough':
        return createElement('s', { key: i }, token.content);

      case 'underline':
        return createElement('u', { key: i }, token.content);

      case 'spoiler':
        return createElement(
          'span',
          {
            key: i,
            className: 'spoiler',
            style: {
              backgroundColor: 'var(--spoiler-bg, #202225)',
              color: 'transparent',
              borderRadius: '3px',
              padding: '0 2px',
              cursor: 'pointer',
              transition: 'all 0.1s',
            },
            onClick: (e: MouseEvent) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--spoiler-bg-revealed, rgba(255,255,255,0.1))';
              el.style.color = 'inherit';
            },
          },
          token.content
        );

      case 'link':
        return createElement(
          'a',
          {
            key: i,
            href: token.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: { color: 'var(--text-link, #00aff4)', textDecoration: 'none' },
            onMouseEnter: (e: MouseEvent) => {
              (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
            },
            onMouseLeave: (e: MouseEvent) => {
              (e.currentTarget as HTMLElement).style.textDecoration = 'none';
            },
          },
          token.content
        );

      case 'br':
        return createElement('br', { key: i });

      case 'text':
      default:
        return token.content;
    }
  });
}

/**
 * Strips markdown formatting from text (useful for previews/notifications).
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/, '').replace(/```$/, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\|\|(.+?)\|\|/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}
