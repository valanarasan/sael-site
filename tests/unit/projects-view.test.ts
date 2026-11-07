import { describe, expect, it } from 'vitest';
import { toMiniProject, toProjectCard, toProjectsView } from '../../src/lib/view-models/projects';
import { fakeImage, projectsFixture } from '../fixtures/content';

const byId = (id: string) => {
  const entry = projectsFixture.find((p) => p.id === id);
  if (!entry) throw new Error(`fixture ${id} missing`);
  return entry;
};

describe('toProjectCard', () => {
  it('builds the tag line from size, kind and location', () => {
    expect(toProjectCard(byId('card-no-photo')).tags).toBe('4 MW solar · Kerala');
    expect(toProjectCard(byId('feature')).tags).toBe('Rooftop · Kerala · Karnataka');
  });

  it('renders a project with no photo', () => {
    const card = toProjectCard(byId('card-no-photo'));
    expect(card).toEqual({
      id: 'card-no-photo',
      title: 'No Photo Co',
      tags: '4 MW solar · Kerala',
      summary: 'A card.',
    });
    expect(card).not.toHaveProperty('image');
  });

  it('passes the photo with its alt text and credit', () => {
    expect(toProjectCard(byId('feature'))).toMatchObject({
      image: { src: fakeImage('feature'), alt: 'A feature photo' },
      credit: 'Photo: Test',
    });
  });

  it('drops a photo that has no alt text rather than render it unlabelled', () => {
    const entry = { id: 'x', data: { ...byId('card-no-photo').data, image: fakeImage('x') } };
    expect(toProjectCard(entry)).not.toHaveProperty('image');
  });
});

describe('toMiniProject', () => {
  it('shows the size as the figure and title · kind as the text', () => {
    expect(toMiniProject(byId('mini-a'))).toEqual({
      id: 'mini-a',
      figure: '2 MW',
      text: 'Confidential · power facilitation',
    });
  });

  it('falls back to the title when there is no size', () => {
    expect(toMiniProject(byId('mini-no-size'))).toEqual({
      id: 'mini-no-size',
      figure: 'Secret site',
      text: 'rooftop',
    });
  });
});

describe('toProjectsView', () => {
  const view = toProjectsView(projectsFixture);

  it('picks the feature project', () => {
    expect(view.feature?.id).toBe('feature');
  });

  it('leaves out drafts', () => {
    expect(view.cards.map((c) => c.id)).toEqual(['card-no-photo']);
  });

  it('orders minis by their order number', () => {
    expect(view.minis.map((m) => m.id)).toEqual(['mini-a', 'mini-b', 'mini-no-size']);
  });

  it('breaks order ties by title', () => {
    const tied = [
      { id: 'b', data: { ...byId('card-no-photo').data, title: 'Beta', order: 1 } },
      { id: 'a', data: { ...byId('card-no-photo').data, title: 'Alpha', order: 1 } },
    ];
    expect(toProjectsView(tied).cards.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('works with no feature project', () => {
    const view2 = toProjectsView(projectsFixture.filter((p) => p.data.layout !== 'feature'));
    expect(view2).not.toHaveProperty('feature');
  });
});
