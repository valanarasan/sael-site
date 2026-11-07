/** Adapters from project entries to the props the Projects section renders. */
import type { ImageMetadata } from 'astro';
import type { Project } from '../schemas/projects';

export interface ProjectEntry {
  id: string;
  data: Project;
}

export interface ProjectCardProps {
  id: string;
  title: string;
  /** e.g. "4.5 MW solar · Karnataka" */
  tags: string;
  summary?: string;
  image?: { src: ImageMetadata; alt: string };
  credit?: string;
}

export interface MiniProjectProps {
  id: string;
  /** e.g. "2 MW" */
  figure: string;
  /** e.g. "Confidential · power facilitation" */
  text: string;
}

export interface ProjectsView {
  feature?: ProjectCardProps;
  cards: ProjectCardProps[];
  minis: MiniProjectProps[];
}

export function toProjectCard({ id, data }: ProjectEntry): ProjectCardProps {
  const sizeAndKind = [data.size, data.kind].filter(Boolean).join(' ');
  const tags = [sizeAndKind, data.location].filter(Boolean).join(' · ');
  return {
    id,
    title: data.title,
    tags,
    ...(data.summary ? { summary: data.summary } : {}),
    ...(data.image && data.alt ? { image: { src: data.image, alt: data.alt } } : {}),
    ...(data.credit ? { credit: data.credit } : {}),
  };
}

export function toMiniProject({ id, data }: ProjectEntry): MiniProjectProps {
  return {
    id,
    figure: data.size ?? data.title,
    text: [data.size ? data.title : undefined, data.kind].filter(Boolean).join(' · '),
  };
}

/** Published projects in display order (order, then title), grouped by layout. */
export function toProjectsView(entries: ProjectEntry[]): ProjectsView {
  const published = entries
    .filter((e) => !e.data.draft)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));

  const [featureEntry] = published.filter((e) => e.data.layout === 'feature');
  return {
    ...(featureEntry ? { feature: toProjectCard(featureEntry) } : {}),
    cards: published.filter((e) => e.data.layout === 'card').map(toProjectCard),
    minis: published.filter((e) => e.data.layout === 'mini').map(toMiniProject),
  };
}
