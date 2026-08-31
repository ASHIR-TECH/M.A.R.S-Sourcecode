import { initialsFrom } from './initialsFrom';

describe('initialsFrom', () => {
  it('derives initials from a full name', () => {
    expect(initialsFrom('Ashir Khan', undefined)).toBe('AK');
  });

  it('falls back to email when no name', () => {
    expect(initialsFrom(undefined, 'op@mars.io')).toBe('O');
  });

  it('falls back to ? when nothing available', () => {
    expect(initialsFrom(undefined, undefined)).toBe('?');
  });

  it('uppercases whitespace-separated initials', () => {
    expect(initialsFrom('ada lovelace', undefined)).toBe('AL');
  });
});
