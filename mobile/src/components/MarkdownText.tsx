import React from 'react';
import { Text, TextStyle, View, StyleSheet, StyleProp } from 'react-native';
import { fonts } from '../theme/typography';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

/**
 * Minimal markdown renderer: splits chat text into plain paragraphs and pipe
 * tables. The agent's fallback prompt answers with `| Device | Status |`
 * tables; without this they printed as literal pipe text. Everything else is
 * rendered verbatim — no full markdown engine is pulled in.
 */

interface MarkdownTable {
  header: string[];
  rows: string[][];
}

type Block = { kind: 'text'; text: string } | { kind: 'table'; table: MarkdownTable };

function splitCells(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim().replace(/\*\*/g, ''));
}

function isSeparator(row: string[]): boolean {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  const isPipe = (line: string) => /^\s*\|/.test(line);

  let i = 0;
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length > 0) {
      blocks.push({ kind: 'text', text: buffer.join('\n') });
      buffer = [];
    }
  };

  while (i < lines.length) {
    if (isPipe(lines[i])) {
      const run: string[] = [lines[i]];
      let j = i + 1;
      while (j < lines.length && isPipe(lines[j])) {
        run.push(lines[j]);
        j += 1;
      }
      if (run.length >= 2 && isSeparator(splitCells(run[1]))) {
        flush();
        blocks.push({
          kind: 'table',
          table: { header: splitCells(run[0]), rows: run.slice(2).map(splitCells) },
        });
      } else {
        buffer.push(...run);
      }
      i = j;
    } else {
      buffer.push(lines[i]);
      i += 1;
    }
  }
  flush();
  return blocks;
}

interface MarkdownTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

function MarkdownTextBase({ text, style }: MarkdownTextProps) {
  const blocks = React.useMemo(() => parse(text), [text]);

  return (
    <React.Fragment>
      {blocks.map((block, index) =>
        block.kind === 'text' ? (
          <Text key={index} style={style}>
            {block.text}
          </Text>
        ) : (
          <View key={index} style={styles.tableWrap}>
            {[block.table.header, ...block.table.rows].map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={[styles.tableRow, rowIndex === 0 && styles.tableHeaderRow]}
              >
                {row.map((cell, cellIndex) => (
                  <Text
                    key={cellIndex}
                    style={rowIndex === 0 ? styles.tableHeaderCell : styles.tableCell}
                    numberOfLines={3}
                  >
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )
      )}
    </React.Fragment>
  );
}

export const MarkdownText = React.memo(MarkdownTextBase);

const styles = StyleSheet.create({
  tableWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.5)',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  tableRow: { flexDirection: 'row' },
  tableHeaderRow: { backgroundColor: 'rgba(232,163,77,0.25)' },
  tableHeaderCell: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.quantico,
    fontSize: 11,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableCell: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.montserrat,
    fontSize: 11,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
});