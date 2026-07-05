import PizZip from 'pizzip';
import { DocumentTemplatePresetKey } from '../common/enums';

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom') as {
  DOMParser: new () => {
    parseFromString: (xml: string, mimeType: string) => XmlDocument;
  };
  XMLSerializer: new () => {
    serializeToString: (document: XmlDocument) => string;
  };
};

type XmlNode = {
  nodeType: number;
  nodeName: string;
  data?: string;
  childNodes: ArrayLike<XmlNode>;
  parentNode: XmlNode | null;
  removeChild: (node: XmlNode) => void;
};

type XmlElement = XmlNode & {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  getElementsByTagName: (name: string) => ArrayLike<XmlElement>;
};

type XmlTextNode = XmlNode & {
  data: string;
};

type XmlDocument = XmlElement & {
  documentElement: XmlElement;
};

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const WORD_PARAGRAPH_NODE_NAME = 'w:p';
const WORD_TEXT_NODE_NAME = 'w:t';
const WORD_RUN_NODE_NAME = 'w:r';
const WORD_PROOF_ERROR_NODE_NAME = 'w:proofErr';

const exclusiveSaleParagraphPlaceholderRules = [
  {
    placeholder: 'family_asset_choice',
    matcher: /\*?\s*bien\s+de\s+familia\s*:/i,
  },
  {
    placeholder: 'donation_choice',
    matcher: /\*?\s*donaci[o\u00F3]n\s*:/i,
  },
  {
    placeholder: 'mortgage_without_release_choice',
    matcher: /\*?\s*registra\s+hipoteca\s+sin\s+levantamiento\s*:/i,
  },
  {
    placeholder: 'succession_in_process_choice',
    matcher: /\*?\s*sucesi[o\u00F3]n\s+en\s+tr[a\u00E1]mite\s*:/i,
  },
  {
    placeholder: 'property_under_construction_choice',
    matcher: /\*?\s*inmueble\s+a\s+construir\s*:/i,
  },
  {
    placeholder: 'credit_eligible_choice',
    matcher: /\*?\s*apto\s+cr[e\u00E9]dito\s*:/i,
  },
] as const;

export function sanitizeDocxTemplateBuffer(
  sourceBuffer: Buffer,
  presetKey?: DocumentTemplatePresetKey,
) {
  const zip = new PizZip(sourceBuffer);

  Object.keys(zip.files)
    .filter((fileName) => fileName.startsWith('word/') && fileName.endsWith('.xml'))
    .forEach((fileName) => {
      const file = zip.file(fileName);
      if (!file) {
        return;
      }

      const xml = file.asText();
      if (
        !xml.includes('<w:proofErr') &&
        !xml.includes('{{') &&
        presetKey !== DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION
      ) {
        return;
      }

      const document = new DOMParser().parseFromString(xml, 'application/xml');
      sanitizeXmlDocument(document, presetKey);
      const sanitizedXml = new XMLSerializer().serializeToString(document);

      zip.file(fileName, sanitizedXml);
    });

  return Buffer.from(
    zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    }),
  );
}

function sanitizeXmlDocument(
  document: XmlDocument,
  presetKey?: DocumentTemplatePresetKey,
) {
  removeProofingMarkers(document);
  mergeSplitTemplatePlaceholders(document.documentElement);
  injectMissingPresetPlaceholders(document.documentElement, presetKey);
}

function removeProofingMarkers(document: XmlDocument) {
  const proofErrors = Array.from(
    document.getElementsByTagName(WORD_PROOF_ERROR_NODE_NAME),
  );

  proofErrors.forEach((proofError) => {
    proofError.parentNode?.removeChild(proofError);
  });
}

function mergeSplitTemplatePlaceholders(parent: XmlNode) {
  const children = Array.from(parent.childNodes);
  let placeholderStartIndex = -1;
  let mergedText = '';

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (placeholderStartIndex >= 0) {
      mergedText += extractVisibleText(child);

      if (mergedText.includes('}}')) {
        collapsePlaceholderRuns(children, placeholderStartIndex, index, mergedText);
        placeholderStartIndex = -1;
        mergedText = '';
      }

      continue;
    }

    const childText = extractVisibleText(child);
    if (!childText.includes('{{') || childText.includes('}}')) {
      continue;
    }

    placeholderStartIndex = index;
    mergedText = childText;
  }

  Array.from(parent.childNodes).forEach((child) => {
    if (child.nodeType === ELEMENT_NODE) {
      mergeSplitTemplatePlaceholders(child);
    }
  });
}

function injectMissingPresetPlaceholders(
  root: XmlElement,
  presetKey?: DocumentTemplatePresetKey,
) {
  if (presetKey !== DocumentTemplatePresetKey.EXCLUSIVE_SALE_AUTHORIZATION) {
    return;
  }

  const paragraphs = Array.from(root.getElementsByTagName(WORD_PARAGRAPH_NODE_NAME));
  paragraphs.forEach((paragraph) => {
    const textNodes = getWordTextNodes(paragraph);
    if (textNodes.length === 0) {
      return;
    }

    const paragraphText = textNodes.map((textNode) => textNode.data ?? '').join('');
    exclusiveSaleParagraphPlaceholderRules.forEach((rule) => {
      const placeholderToken = `{{${rule.placeholder}}}`;
      if (
        paragraphText.includes(placeholderToken) ||
        !rule.matcher.test(paragraphText)
      ) {
        return;
      }

      const lastTextNode = textNodes[textNodes.length - 1];
      lastTextNode.data = `${lastTextNode.data ?? ''} ${placeholderToken}`;
    });
  });
}

function collapsePlaceholderRuns(
  siblings: XmlNode[],
  startIndex: number,
  endIndex: number,
  mergedText: string,
) {
  const startNode = siblings[startIndex];
  if (startNode.nodeName !== WORD_RUN_NODE_NAME) {
    return;
  }

  const textNodes = getWordTextNodes(startNode);
  if (textNodes.length === 0) {
    return;
  }

  textNodes[0].data = mergedText;
  const textElement = textNodes[0].parentNode as XmlElement | null;

  if (/^\s|\s$/.test(mergedText)) {
    textElement?.setAttribute('xml:space', 'preserve');
  } else {
    textElement?.removeAttribute('xml:space');
  }

  textNodes.slice(1).forEach((textNode) => {
    textNode.parentNode?.removeChild(textNode);
  });

  for (let index = endIndex; index > startIndex; index -= 1) {
    siblings[index].parentNode?.removeChild(siblings[index]);
  }
}

function extractVisibleText(node: XmlNode) {
  if (node.nodeName === WORD_RUN_NODE_NAME) {
    return getWordTextNodes(node).map((textNode) => textNode.data ?? '').join('');
  }

  return '';
}

function getWordTextNodes(node: XmlNode) {
  const result: XmlTextNode[] = [];
  collectWordTextNodes(node, result);
  return result;
}

function collectWordTextNodes(node: XmlNode, result: XmlTextNode[]) {
  if (node.nodeType === ELEMENT_NODE && node.nodeName === WORD_TEXT_NODE_NAME) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === TEXT_NODE) {
        result.push(child as XmlTextNode);
      }
    });
    return;
  }

  Array.from(node.childNodes).forEach((child) => {
    collectWordTextNodes(child, result);
  });
}
