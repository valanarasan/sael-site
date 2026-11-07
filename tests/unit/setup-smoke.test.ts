// Proves the test setup works: Vitest can render an Astro page through the Container API.
// Replace with real component tests once the sections exist (step 5).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import IndexPage from '../../src/pages/index.astro';

describe('test setup', () => {
  it('renders an Astro page with the Container API', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(IndexPage);

    expect(html).toContain('<html lang="en"');
    expect(html).toMatch(/<h1[^>]*>SAEL Energy<\/h1>/);
  });
});
