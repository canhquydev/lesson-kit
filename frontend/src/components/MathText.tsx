import { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text?: string;
  className?: string;
}

const COMMON_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "so", "as", "at", "by", "for",
  "in", "of", "on", "to", "up", "with", "into", "from", "than", "then",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "this", "that", "these", "those", "it", "its", "they", "them", "their", "we", "us", "our",
  "you", "your", "he", "him", "his", "she", "her", "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
  "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
  "apply", "applies", "applied", "point", "points", "waves", "wave", "type", "types",
  "charge", "charges", "field", "fields", "electric", "potential", "energy", "force", "forces", "work", "distance",
  "placed", "moves", "moved", "moving", "calculate", "find", "given", "equal", "equals", "decrease", "increase"
]);

function isMathToken(token: string): boolean {
  if (!token) return false;
  // Strip parentheses and trailing punctuation
  const clean = token.replace(/^[(]+/, "").replace(/[,;:.?!)"]+$/, "");
  if (!clean) return false;

  // Has digits or math operators
  if (/[0-9_/^=+\-*]/.test(clean)) return true;
  // Single letter variable
  if (/^[a-zA-Z]$/.test(clean)) return true;
  // Common English dictionary words are NOT math
  if (COMMON_WORDS.has(clean.toLowerCase())) return false;
  // Non-ASCII (e.g. Vietnamese words like "có", "áp", "dụng") are NOT math
  if (/[^\x00-\x7F]/.test(clean)) return false;
  // Short product like qEd, VM, AB (max 4 chars)
  if (/^[a-zA-Z]{2,4}$/.test(clean)) return true;

  return false;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toLatex(formula: string): string {
  let s = formula.trim();
  // Format scientific multiplication: 2.10^-6 -> 2 \cdot 10^{-6}
  s = s.replace(/(\d+)\.(\d+)\^([-+]?\d+)/g, "$1 \\cdot $2^{$3}");
  // Format powers: x^2, 10^-6, 10^4
  s = s.replace(/([a-zA-Z0-9]+)\^([-+]?[0-9a-zA-Z]+)/g, "$1^{$2}");
  // Format subscripts: W_M -> W_{M}, A_MN -> A_{MN}
  s = s.replace(/\b([A-Za-z]+)_([A-Za-z0-9]+)\b/g, "$1_{$2}");
  return s;
}

function renderTextSegment(text: string): string {
  let s = escapeHtml(text);

  // Standalone subscripts: W_M, V_M, A_MN
  s = s.replace(/\b([A-Za-z]+)_([A-Za-z0-9]+)\b/g, (m, v, sub) => {
    try {
      return katex.renderToString(`${v}_{${sub}}`, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return m;
    }
  });

  // Standalone powers: 10^-6, 10^4
  s = s.replace(/\b(\d+(?:\.\d+)?)\^([-+]?\d+)\b/g, (m, b, p) => {
    try {
      return katex.renderToString(`${b}^{${p}}`, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return m;
    }
  });

  return s;
}

export function renderMathHtml(text?: string): string {
  if (!text) return "";

  // 1) Match equation beginnings: [Variable] = 
  const eqStartRegex = /\b([A-Za-z](?:_[A-Za-z0-9]+)?)\s*=\s*/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = eqStartRegex.exec(text)) !== null) {
    const startIndex = match.index;
    const afterEqualsIndex = eqStartRegex.lastIndex;

    const remainder = text.slice(afterEqualsIndex);
    const tokens = remainder.split(/(\s+)/);

    let currentOffset = 0;
    let lastRhsEndOffset = 0;
    let hasRhsToken = false;
    let openParens = 0;

    for (let i = 0; i < tokens.length; i++) {
      const part = tokens[i];
      if (/^\s+$/.test(part)) {
        currentOffset += part.length;
        continue;
      }

      const opens = (part.match(/\(/g) || []).length;
      const closes = (part.match(/\)/g) || []).length;
      openParens += (opens - closes);

      if (isMathToken(part)) {
        currentOffset += part.length;
        lastRhsEndOffset = currentOffset;
        hasRhsToken = true;
        if (openParens <= 0 && /[,;:.?!"]$/.test(part)) {
          break;
        }
      } else {
        if (openParens <= 0) {
          break;
        } else {
          currentOffset += part.length;
          lastRhsEndOffset = currentOffset;
        }
      }
    }

    if (hasRhsToken) {
      // Render text before formula
      result += renderTextSegment(text.slice(lastIndex, startIndex));

      let formulaStr = text.slice(startIndex, afterEqualsIndex + lastRhsEndOffset);
      let trailingPunct = "";
      const punctMatch = formulaStr.match(/[,;:.?!"]+$/);
      if (punctMatch && openParens <= 0) {
        trailingPunct = punctMatch[0];
        formulaStr = formulaStr.slice(0, -trailingPunct.length);
      }

      try {
        const latex = toLatex(formulaStr);
        result += katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        result += escapeHtml(formulaStr);
      }
      result += escapeHtml(trailingPunct);

      lastIndex = startIndex + formulaStr.length + trailingPunct.length;
      eqStartRegex.lastIndex = lastIndex;
    }
  }

  // Render remaining text
  result += renderTextSegment(text.slice(lastIndex));
  return result;
}

export function MathText({ text, className = "" }: MathTextProps) {
  const html = useMemo(() => renderMathHtml(text), [text]);

  if (!text) return null;

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
