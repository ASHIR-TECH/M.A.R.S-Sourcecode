import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusDot } from '@/components/StatusDot';
import { colours } from '@/constants/colours';

describe('StatusDot', () => {
  it('renders green for the connected state', () => {
    const { getByTestId } = render(<StatusDot status="connected" />);
    expect(getByTestId('status-dot-connected')).toHaveStyle({
      backgroundColor: colours.stateSuccess,
    });
  });

  it('renders grey for the offline state', () => {
    const { getByTestId } = render(<StatusDot status="offline" />);
    expect(getByTestId('status-dot-offline')).toHaveStyle({
      backgroundColor: colours.textMuted,
    });
  });

  it('renders amber for the processing state', () => {
    const { getByTestId } = render(<StatusDot status="processing" />);
    expect(getByTestId('status-dot-processing')).toHaveStyle({
      backgroundColor: colours.stateWarning,
    });
  });

  it('renders a circular dot at the default 10pt size', () => {
    const { getByTestId } = render(<StatusDot status="connected" />);
    expect(getByTestId('status-dot-connected')).toHaveStyle({
      width: 10,
      height: 10,
      borderRadius: 5,
    });
  });
});
