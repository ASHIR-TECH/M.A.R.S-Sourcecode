import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ToolCallStep } from './ToolCallStep';
import { AgentToolCall } from '../desktop/types';

const call: AgentToolCall = {
  name: 'send_file',
  status: 'completed',
  params: { peer_id: 'MARS-DEVICE' },
  result: 'Delivered report.pdf',
};

describe('ToolCallStep', () => {
  it('shows the tool name collapsed and reveals details when tapped', () => {
    const { getByText, queryByText } = render(<ToolCallStep call={call} />);

    expect(getByText('send_file')).toBeTruthy();
    expect(queryByText('Delivered report.pdf')).toBeNull();

    fireEvent.press(getByText('send_file'));

    expect(getByText('Delivered report.pdf')).toBeTruthy();
    expect(getByText(/peer_id: MARS-DEVICE/)).toBeTruthy();
  });
});
