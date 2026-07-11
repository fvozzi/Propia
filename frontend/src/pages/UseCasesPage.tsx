import { Fragment, useMemo } from 'react';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { useI18n } from '../lib/i18n';
import useCasesMarkdown from '../../../docs/use-cases.md?raw';

type MarkdownBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'code'; code: string };

export function UseCasesPage() {
  const { t } = useI18n();
  const blocks = useMemo(() => parseMarkdown(useCasesMarkdown), []);

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('useCases.eyebrow')}
        title={t('useCases.title')}
      />

      <section className="card use-cases-doc">
        {blocks.map((block, index) => {
          if (block.type === 'h1') {
            return <h1 key={index}>{block.text}</h1>;
          }

          if (block.type === 'h2') {
            return <h2 key={index}>{block.text}</h2>;
          }

          if (block.type === 'h3') {
            return <h3 key={index}>{block.text}</h3>;
          }

          if (block.type === 'p') {
            return (
              <p key={index}>
                {renderInlineMarkdown(block.text)}
              </p>
            );
          }

          if (block.type === 'code') {
            return (
              <pre key={index} className="use-cases-code">
                <code>{block.code}</code>
              </pre>
            );
          }

          if (!('items' in block)) {
            return null;
          }

          const ListTag = block.type;
          return (
            <ListTag key={index}>
              {block.items.map((item: string, itemIndex: number) => (
                <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
              ))}
            </ListTag>
          );
        })}
      </section>
    </div>
  );
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: 'p',
      text: paragraphLines.join(' '),
    });
    paragraphLines = [];
  }

  function flushList() {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }

    blocks.push({
      type: listType,
      items: listItems,
    });
    listType = null;
    listItems = [];
  }

  function flushCode() {
    if (codeLines.length === 0) {
      return;
    }

    blocks.push({
      type: 'code',
      code: codeLines.join('\n'),
    });
    codeLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const compact = trimmed.trim();

    if (compact.startsWith('```')) {
      flushParagraph();
      flushList();

      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(trimmed);
      continue;
    }

    if (!compact) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = compact.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();

      const depth = headingMatch[1].length;
      blocks.push({
        type: depth === 1 ? 'h1' : depth === 2 ? 'h2' : 'h3',
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const unorderedMatch = compact.match(/^-\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') {
        flushList();
      }
      listType = 'ul';
      listItems.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = compact.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') {
        flushList();
      }
      listType = 'ol';
      listItems.push(orderedMatch[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(compact);
  }

  flushParagraph();
  flushList();
  flushCode();

  return blocks;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={index} href={linkMatch[2]} target="_blank" rel="noreferrer">
          {linkMatch[1]}
        </a>
      );
    }

    const boldParts = part.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    if (boldParts.length > 1) {
      return (
        <Fragment key={index}>
          {boldParts.map((boldPart, boldIndex) =>
            boldPart.startsWith('**') && boldPart.endsWith('**') ? (
              <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>
            ) : (
              <Fragment key={boldIndex}>{boldPart}</Fragment>
            ),
          )}
        </Fragment>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}
