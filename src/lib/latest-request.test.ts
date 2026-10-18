import { it, expect } from 'vitest';
import { LatestRequest } from './latest-request';
it('a newer upload prevents the previous upload from committing results', () => {
  const requests = new LatestRequest(), old = requests.begin(), current = requests.begin();
  expect(old.signal.aborted).toBe(true); expect(requests.isCurrent(old)).toBe(false); expect(requests.isCurrent(current)).toBe(true);
  requests.cancel(); expect(requests.isCurrent(current)).toBe(false);
});
