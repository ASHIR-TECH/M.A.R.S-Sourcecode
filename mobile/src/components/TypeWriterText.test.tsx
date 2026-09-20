import React from 'react';
import { render, act } from '@testing-library/react-native';
import { TypeWriterText } from './TypeWriterText';

function treeText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(treeText).join('');
  if (node && typeof node === 'object' && 'children' in node) {
    return treeText((node as { children: unknown }).children);
  }
  return '';
}

describe('TypeWriterText', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reveals text word by word and calls onDone once', () => {
    const onDone = jest.fn();
    const { toJSON } = render(<TypeWriterText text="one two three" onDone={onDone} />);

    expect(treeText(toJSON())).toBe('▍');

    act(() => jest.advanceTimersByTime(24));
    expect(treeText(toJSON())).toBe('one ▍');

    act(() => jest.advanceTimersByTime(24));
    expect(treeText(toJSON())).toBe('one two ▍');

    act(() => jest.advanceTimersByTime(24));
    expect(treeText(toJSON())).toBe('one two three');
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(500));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reveals several words per tick for long text so it stays fast', () => {
    const long = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ');
    const { toJSON } = render(<TypeWriterText text={long} />);

    act(() => jest.advanceTimersByTime(100));
    const shown = treeText(toJSON()).replace('▍', '');
    const revealed = shown.trim().split(/\s+/).length;

    expect(revealed).toBeGreaterThan(1);
    expect(revealed).toBeLessThan(300);
  });
});
