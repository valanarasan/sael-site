// Keeps .pages.yml (the Pages CMS forms) in step with the Zod content schemas. If they drift, an
// editor's save can remove a value or produce one the build rejects, so a drift fails here first.
// It compares the config with the schemas, never with the content itself.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blogSchema } from '../../src/lib/schemas/blog';
import { chatSchema } from '../../src/lib/schemas/chat';
import { faqSchema } from '../../src/lib/schemas/faqs';
import { projectSchema } from '../../src/lib/schemas/projects';
import { sectionsSchema } from '../../src/lib/schemas/sections';
import { settingsSchema } from '../../src/lib/schemas/settings';
import { subsidySchema } from '../../src/lib/schemas/subsidy';
import { blogRefStub, imageStub } from '../fixtures/content';

interface Field {
  name: string;
  type?: string;
  component?: string;
  required?: boolean;
  readonly?: boolean;
  label?: string | false;
  description?: string;
  pattern?: string | { regex: string; message?: string };
  options?: Record<string, unknown>;
  list?: boolean | { min?: number; max?: number };
  fields?: Field[];
}

interface Entry {
  name: string;
  label?: string;
  type: 'file' | 'collection' | 'group';
  path?: string;
  format?: string;
  list?: boolean;
  fields?: Field[];
  items?: Entry[];
}

interface Media {
  name: string;
  input: string;
  output: string;
}

const config = parse(readFileSync('.pages.yml', 'utf8')) as {
  media: Media[];
  components: Record<string, Omit<Field, 'name'>>;
  content: Entry[];
  settings: { content: { merge: boolean } };
};

/** Same result as Pages CMS: the component's keys, overridden by the field's own (deep merge). */
function resolve(field: Field): Field {
  if (!field.component) return field;
  const base = config.components[field.component];
  if (!base) throw new Error(`Unknown component ${field.component}`);
  const { component: _component, ...own } = field;
  return { ...base, ...own, options: { ...base.options, ...own.options } } as Field;
}

const flatten = (entries: Entry[]): Entry[] =>
  entries.flatMap((e) => (e.type === 'group' ? flatten(e.items ?? []) : [e]));
const entries = flatten(config.content);
const entriesAt = (path: string) => entries.filter((e) => e.path === path);
const fieldsAt = (path: string) => entriesAt(path).flatMap((e) => e.fields ?? []);

interface Check {
  _zod: {
    def: { check: string; minimum?: number; maximum?: number; format?: string; pattern?: RegExp };
  };
}

/** The parts of a Zod schema this test reads (Zod's own types don't describe them all). */
interface AnyZod {
  minValue?: number | null;
  maxValue?: number | null;
  _zod: {
    def: Record<string, unknown> & { type: string; checks?: Check[]; format?: string };
  };
}

/** The limits set by .min(), .max(), .regex() and .includes() on a schema. */
function limitsOf(schema: AnyZod) {
  const defs = (schema._zod.def.checks ?? []).map((c) => c._zod.def);
  return {
    minimum: defs.find((d) => d.check === 'min_length')?.minimum,
    maximum: defs.find((d) => d.check === 'max_length')?.maximum,
    pattern: defs.find((d) => d.check === 'string_format' && d.pattern)?.pattern?.source,
  };
}

interface Unwrapped {
  schema: AnyZod;
  optional: boolean;
  hasDefault: boolean;
}

/** Sees through optional, default and transforms to the schema that does the checking. */
function unwrap(input: z.ZodType): Unwrapped {
  let schema = input as unknown as AnyZod;
  let optional = false;
  let hasDefault = false;
  for (;;) {
    const { def } = schema._zod;
    if (def.type === 'optional' || def.type === 'nullable') optional = true;
    else if (def.type === 'default') hasDefault = true;
    else if (def.type === 'pipe') {
      const side = (def.in as AnyZod)._zod.def.type === 'transform' ? def.out : def.in;
      schema = side as AnyZod;
      continue;
    } else return { schema, optional, hasDefault };
    schema = def.innerType as AnyZod;
  }
}

/** Zod types Pages CMS field types can hold. */
const TYPES: Record<string, string[]> = {
  string: ['string', 'text', 'reference', 'file'],
  enum: ['select'],
  number: ['number'],
  boolean: ['boolean'],
  date: ['date'],
  custom: ['image'],
  object: ['object'],
};

const limit = (value: unknown) =>
  typeof value === 'number' && Math.abs(value) < 1e12 ? value : undefined;
const patternOf = (f: Field) => (typeof f.pattern === 'object' ? f.pattern.regex : f.pattern);

/** Every difference between one Zod value and the form field that edits it. */
function compareValue(
  where: string,
  zod: z.ZodType,
  field: Field,
  { itemOfList = false } = {},
): string[] {
  const problems: string[] = [];
  const { schema, optional, hasDefault } = unwrap(zod);
  const { type } = schema._zod.def;

  if (type === 'array') {
    const item = (schema._zod.def as unknown as { element: z.ZodType }).element;
    const isMulti = field.options?.multiple === true;
    const list = typeof field.list === 'object' ? field.list : isMulti ? field.options : undefined;
    if (!field.list && !isMulti) return [`${where}: Zod has a list, the form does not`];
    const { minimum, maximum } = limitsOf(schema);
    if (!optional && !hasDefault && !minimum)
      problems.push(`${where}: an emptied list is deleted on save, so give it .default([])`);
    if ((list?.min as number | undefined) !== minimum)
      problems.push(`${where}: list min is ${String(list?.min)}, Zod says ${String(minimum)}`);
    if ((list?.max as number | undefined) !== maximum)
      problems.push(`${where}: list max is ${String(list?.max)}, Zod says ${String(maximum)}`);
    return [
      ...problems,
      ...(isMulti
        ? []
        : compareValue(where, item, { ...field, list: false }, { itemOfList: true })),
    ];
  }

  if (field.list && !itemOfList) problems.push(`${where}: the form has a list, Zod does not`);

  const allowed = TYPES[type];
  if (!allowed) return [`${where}: no form type is defined for Zod type ${type}`];
  if (!field.type || !allowed.includes(field.type))
    problems.push(`${where}: form type ${String(field.type)} can't hold Zod type ${type}`);

  const mustExist = !optional && !hasDefault;
  // An object inside a list exists only if someone adds it, so `required` means nothing there.
  const skipRequired = type === 'boolean' || (type === 'object' && itemOfList);
  if (!skipRequired && Boolean(field.required) !== mustExist)
    problems.push(`${where}: required is ${String(field.required)}, should be ${mustExist}`);

  if (type === 'object') {
    const shape = (schema._zod.def as unknown as { shape: Record<string, z.ZodType> }).shape;
    return [...problems, ...compareObject(where, shape, field.fields ?? [])];
  }

  if (type === 'enum') {
    const entriesOfEnum = (schema._zod.def as unknown as { entries: Record<string, string> })
      .entries;
    const values = (field.options?.values as (string | { value: string })[] | undefined) ?? [];
    const got = values.map((v) => (typeof v === 'string' ? v : v.value)).sort();
    if (JSON.stringify(got) !== JSON.stringify(Object.values(entriesOfEnum).sort()))
      problems.push(`${where}: select values differ from Zod's`);
  }

  if (type === 'string') {
    const { minimum, maximum, pattern } = limitsOf(schema);
    if (limit(maximum) !== field.options?.maxlength)
      problems.push(
        `${where}: maxlength is ${String(field.options?.maxlength)}, Zod says ${String(maximum)}`,
      );
    // Pages CMS applies minlength and patterns to empty values too, so optional text has neither.
    const wantMin = !mustExist || !minimum || minimum <= 1 ? undefined : minimum;
    if (wantMin !== field.options?.minlength)
      problems.push(
        `${where}: minlength is ${String(field.options?.minlength)}, should be ${String(wantMin)}`,
      );
    if (!mustExist && (field.pattern || field.options?.minlength))
      problems.push(`${where}: optional text can't have a pattern or minlength`);
    // Email addresses are checked by the build; the form field for a video is a file picker.
    const regex = schema._zod.def.format || field.type === 'file' ? undefined : pattern;
    if (regex && patternOf(field) !== regex)
      problems.push(`${where}: pattern is ${String(patternOf(field))}, Zod says ${regex}`);
  }
  if (type === 'number') {
    for (const [key, value] of [
      ['min', schema.minValue],
      ['max', schema.maxValue],
    ] as const) {
      const want = limit(value);
      if (want !== undefined && want !== field.options?.[key])
        problems.push(`${where}: ${key} is ${String(field.options?.[key])}, Zod says ${want}`);
    }
  }
  return problems;
}

/** Compares one Zod object with its form fields, in both directions. */
function compareObject(
  where: string,
  shape: Record<string, z.ZodType>,
  rawFields: Field[],
  { extraFields = [] as string[] } = {},
): string[] {
  const fields = rawFields.map(resolve);
  const names = fields.map((f) => f.name);
  const problems = [
    ...Object.keys(shape)
      .filter((k) => !names.includes(k))
      .map((k) => `${where}.${k}: in Zod, missing from .pages.yml`),
    ...names
      .filter((n) => !(n in shape) && !extraFields.includes(n))
      .map((n) => `${where}.${n}: in .pages.yml, not in Zod`),
    ...names
      .filter((n, i) => names.indexOf(n) !== i)
      .map((n) => `${where}.${n}: appears twice in .pages.yml`),
  ];
  for (const field of fields) {
    const zod = shape[field.name];
    if (zod) problems.push(...compareValue(`${where}.${field.name}`, zod, field));
  }
  return problems;
}

const shapeOf = (schema: z.ZodType) =>
  (unwrap(schema).schema._zod.def as unknown as { shape: Record<string, z.ZodType> }).shape;

describe('.pages.yml matches the Zod schemas', () => {
  it.each([
    ['settings', 'src/content/settings.json', settingsSchema, []],
    ['sections', 'src/content/sections.json', sectionsSchema(imageStub), []],
    ['subsidy', 'src/content/subsidy.json', subsidySchema, []],
    ['chat', 'src/content/chat.json', chatSchema(blogRefStub), []],
    ['FAQs', 'src/content/faqs.json', faqSchema, []],
    ['projects', 'src/content/projects', projectSchema(imageStub), []],
    ['blog', 'src/content/blog', blogSchema(imageStub), ['body']],
  ] as const)('%s', (name, path, schema, extraFields) => {
    expect(
      compareObject(name, shapeOf(schema), fieldsAt(path), { extraFields: [...extraFields] }),
    ).toEqual([]);
  });

  it('catches a drift between a schema and the form', () => {
    const shape = { title: z.string().max(10), tags: z.array(z.string()), extra: z.string() };
    const problems = compareObject('demo', shape, [
      { name: 'title', type: 'string', options: { maxlength: 20 } },
      { name: 'tags', type: 'string', required: true, list: true },
      { name: 'stray', type: 'string' },
    ]);
    expect(problems.join('\n')).toMatch(/demo\.extra: in Zod, missing/);
    expect(problems.join('\n')).toMatch(/demo\.stray: in \.pages\.yml, not in Zod/);
    expect(problems.join('\n')).toMatch(/demo\.title: required is undefined, should be true/);
    expect(problems.join('\n')).toMatch(/demo\.title: maxlength is 20, Zod says 10/);
    expect(problems.join('\n')).toMatch(/demo\.tags: an emptied list is deleted on save/);
  });
});

describe('.pages.yml structure', () => {
  it('has a form for every file in src/content', () => {
    const files = readdirSync('src/content', { withFileTypes: true }).map((d) =>
      posix.join('src/content', d.name),
    );
    const paths = new Set(entries.map((e) => e.path));
    expect(files.filter((f) => !paths.has(f))).toEqual([]);
    expect([...paths].filter((p) => !p || !existsSync(p))).toEqual([]);
  });

  it('gives every home-page section its own form on sections.json, with merging on', () => {
    const forms = entriesAt('src/content/sections.json');
    expect(forms.length).toBe(Object.keys(shapeOf(sectionsSchema(imageStub))).length);
    forms.forEach((form) => expect(form.fields).toHaveLength(1));
    // Without merge, saving one section would delete all the others.
    expect(config.settings.content.merge).toBe(true);
  });

  it('uses unique names for forms and media', () => {
    const names = [...entries.map((e) => e.name), ...config.media.map((m) => m.name)];
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  it('sets collapsible on every list written as an object (Pages CMS requires it)', () => {
    const missing: string[] = [];
    const walk = (fields: Field[], where: string) => {
      for (const field of fields) {
        const at = `${where}.${field.name}`;
        if (typeof field.list === 'object' && !('collapsible' in field.list)) missing.push(at);
        walk(field.fields ?? [], at);
      }
    };
    for (const entry of entries) walk(entry.fields ?? [], entry.name);
    for (const [name, component] of Object.entries(config.components))
      walk(component.fields ?? [], name);
    expect(missing).toEqual([]);
  });

  it('labels every field a person edits', () => {
    const unlabelled: string[] = [];
    const walk = (fields: Field[], where: string) => {
      for (const raw of fields) {
        const field = resolve(raw);
        const at = `${where}.${field.name}`;
        if (field.label === undefined) unlabelled.push(at);
        walk(field.fields ?? [], at);
      }
    };
    for (const entry of entries) {
      expect(entry.label, entry.name).toBeTruthy();
      walk(entry.fields ?? [], entry.name);
    }
    expect(unlabelled).toEqual([]);
  });

  it('writes photo paths relative to the file that uses them, as Astro needs', () => {
    const images = config.media.filter((m) => m.input === 'src/assets/images');
    expect(images.length).toBeGreaterThan(0);
    const problems: string[] = [];
    const walk = (fields: Field[], from: string, where: string) => {
      for (const raw of fields) {
        const field = resolve(raw);
        if (field.type === 'image' || field.type === 'rich-text') {
          const media = config.media.find((m) => m.name === field.options?.media);
          if (!media) problems.push(`${where}.${field.name}: no media source`);
          else if (posix.relative(from, media.input) !== media.output)
            problems.push(`${where}.${field.name}: ${media.name} gives the wrong relative path`);
        }
        walk(field.fields ?? [], from, `${where}.${field.name}`);
      }
    };
    for (const entry of entries) {
      const path = entry.path ?? '';
      const from = entry.type === 'collection' ? path : dirname(path);
      walk(entry.fields ?? [], from, entry.name);
    }
    expect(problems).toEqual([]);
  });

  it('stores the contact video where the page can load it', () => {
    const videos = config.media.find((m) => m.name === 'videos');
    expect(videos).toMatchObject({ input: 'public/video', output: '/video' });
  });

  it('stores blog dates the way the schema reads them, starting empty', () => {
    const blog = entriesAt('src/content/blog')[0];
    for (const name of ['publishDate', 'updatedDate']) {
      const field = blog?.fields?.find((f) => f.name === name) as Field & { default?: string };
      expect(field.options?.format).toBe('yyyy-MM-dd');
      // Otherwise Pages CMS fills in today, which would date every draft that gets saved.
      expect(field.default).toBe('');
    }
  });

  it('never offers the removed products', () => {
    expect(readFileSync('.pages.yml', 'utf8')).not.toMatch(/atta chakki|water heater|ghana/i);
  });
});
