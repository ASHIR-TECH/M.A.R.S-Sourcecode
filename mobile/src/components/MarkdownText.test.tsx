import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  it('renders plain text unchanged', () => {
    const { getByText } = render(<MarkdownText text="Just some words." />);
    expect(getByText('Just some words.')).toBeTruthy();
  });

  it('parses a pipe table into header + rows', () => {
    const md =
      '| Device | Status | Value |\n' +
      '|---|---|---|\n' +
      '| CONTRACTOR | online | 99% |\n' +
      '| ORBIT-ONE | idle | 12% |';
    const { getByText } = render(<MarkdownText text={md} />);

    expect(getByText('CONTRACTOR')).toBeTruthy();
    expect(getByText('online')).toBeTruthy();
    expect(getByText('ORBIT-ONE')).toBeTruthy();
    expect(getByText('idle')).toBeTruthy();
  });

  it('keeps surrounding paragraphs and strips bold markers', () => {
    const { getByText } = render(
      <MarkdownText
        text={['Hello.', '', '| A | B |', '|---|---|', '| **1** | 2 |', '', 'Bye.'].join('\n')}
      />
    );
    expect(getByText(/Hello\./)).toBeTruthy();
    expect(getByText(/Bye\./)).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });
});