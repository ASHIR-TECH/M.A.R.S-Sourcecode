import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '@/components/Badge';
import { colours, statusColours } from '@/constants/colours';

describe('Badge', () => {
  const variants = [
    'Delivered',
    'Verified',
    'Pending',
    'InProgress',
    'Failed',
    'Cancelled',
    'Alerted',
  ] as const;

  it.each(variants)('renders the %s variant with the correct colours', (variant) => {
    const { getByTestId, getByText } = render(<Badge label={variant} variant={variant} />);

    const pill = getByTestId(`badge-${variant}`);
    const expected = statusColours[variant];
    expect(pill).toHaveStyle({ borderColor: expected, backgroundColor: `${expected}1A` });
    expect(getByText(variant)).toHaveStyle({ color: expected });
  });

  it('renders a label with uppercase styling', () => {
    const { getByText } = render(<Badge label="Failed" variant="Failed" />);
    expect(getByText('Failed')).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('uses the correct gold palette constant for styling', () => {
    expect(colours.gold).toBe('#C9A84C');
  });
});
