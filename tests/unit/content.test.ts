import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsFixture } from '../fixtures/settings';

const getEntry = vi.fn();
vi.mock('astro:content', () => ({ getEntry }));

const { getSettings } = await import('../../src/lib/content');

describe('getSettings', () => {
  beforeEach(() => getEntry.mockReset());

  it('returns the settings entry data', async () => {
    getEntry.mockResolvedValue({ id: 'settings', data: settingsFixture });
    await expect(getSettings()).resolves.toEqual(settingsFixture);
    expect(getEntry).toHaveBeenCalledWith('settings', 'settings');
  });

  it('fails clearly when settings.json is missing', async () => {
    getEntry.mockResolvedValue(undefined);
    await expect(getSettings()).rejects.toThrow(/settings\.json/);
  });
});
