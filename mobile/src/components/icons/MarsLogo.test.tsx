import React from 'react';
import { render } from '@testing-library/react-native';
import { MarsLogo } from './MarsLogo';

test('MarsLogo renders an Svg with a Path', () => {
  const { toJSON } = render(<MarsLogo size={120} />);
  const tree = JSON.stringify(toJSON());
  expect(tree).toContain('RNSVGSvgView');
  expect(tree).toContain('RNSVGPath');
});
