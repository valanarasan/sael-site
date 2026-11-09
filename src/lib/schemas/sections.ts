import { z } from 'astro/zod';
import { accentText, linkSchema, photo, statSchema, tokenText, type ImageField } from './common';

/**
 * Copy for every home-page section (and the blog page header), in page order.
 * Headings can wrap words in *asterisks* for the serif italic accent.
 * `placeholder: true` keeps an item visibly marked "Content from SAEL" until real text arrives.
 */
const eyebrow = z.string().min(1).max(60);
const heading = accentText.max(120);
const paragraph = z.string().min(1).max(600);

export const sectionsSchema = (image: ImageField) => {
  const pic = photo(image);

  return z.object({
    hero: z.object({
      eyebrow,
      /** One entry per line of the big headline. */
      headline: z.array(accentText.max(40)).min(1).max(3),
      intro: paragraph,
      primaryCta: linkSchema,
      secondaryCta: linkSchema,
      fact: z.object({ value: z.string().min(1).max(20), label: z.string().min(1).max(60) }),
      /** Accessible name for the row of photos (it scrolls sideways on phones). */
      slidesLabel: z.string().min(1).max(60),
      /** The first slide is the page's main image and loads first. */
      slides: z
        .array(
          pic.extend({
            tag: z.string().min(1).max(40),
            title: z.string().min(1).max(60),
            credit: z.string().min(1).max(60),
          }),
        )
        .min(1)
        .max(6),
    }),

    highlights: z.object({
      label: z.string().min(1),
      items: z
        .array(
          z.object({
            icon: z.enum(['home', 'rupee', 'wrench', 'clock']),
            title: z.string().min(1).max(40),
            text: z.string().min(1).max(60),
          }),
        )
        .min(1)
        .max(4),
    }),

    systems: z.object({
      eyebrow,
      heading,
      table: z.object({
        label: z.string().min(1),
        columns: z.object({ onGrid: z.string(), offGrid: z.string(), hybrid: z.string() }),
        rows: z
          .array(
            z.object({
              label: z.string().min(1).max(40),
              onGrid: z.string().max(40),
              offGrid: z.string().max(40),
              hybrid: z.string().max(40),
              /** Show a tick before every value that isn't "—". */
              tick: z.boolean().default(false),
            }),
          )
          .min(1),
      }),
      finder: z.object({
        label: z.string().min(1),
        gridQuestion: z.string().min(1),
        cutsQuestion: z.string().min(1),
        yes: z.string().min(1),
        no: z.string().min(1),
        rarely: z.string().min(1),
        often: z.string().min(1),
        resultLabel: z.string().min(1),
        results: z.object({
          onGrid: z.object({ name: z.string(), why: z.string() }),
          hybrid: z.object({ name: z.string(), why: z.string() }),
          offGrid: z.object({ name: z.string(), why: z.string() }),
        }),
        more: z.object({ text: z.string(), link: linkSchema }),
        cta: linkSchema,
      }),
    }),

    subsidy: z.object({
      eyebrow,
      heading,
      intro: paragraph,
      /** The slab figures themselves come from subsidy.json. */
      handles: z.array(z.string().min(1).max(60)).max(6).default([]),
      calculator: z.object({
        label: z.string().min(1),
        sizeLabel: z.string().min(1),
        stateLabel: z.string().min(1),
        /** Used for "Other states". */
        stateTopUpLabel: z.string().min(1),
        /** Used for a named state; {state} is replaced with its name. */
        namedStateTopUpLabel: z.string().includes('{state}'),
        centralTotalLabel: z.string().min(1),
        combinedTotalLabel: z.string().min(1),
        note: z.string().max(240),
        cta: linkSchema,
      }),
    }),

    process: z.object({
      eyebrow,
      heading,
      steps: z
        .array(z.object({ title: z.string().min(1).max(40), text: z.string().min(1).max(200) }))
        .min(2)
        .max(8),
      tracker: z.object({
        label: z.string().min(1),
        stages: z.array(z.string().min(1).max(40)).min(2).max(8),
      }),
    }),

    why: z.object({
      eyebrow,
      heading,
      feature: pic.extend({ credit: z.string().max(60), title: z.string().min(1).max(120) }),
      tiles: z
        .array(
          z.object({
            title: z.string().min(1).max(60),
            text: z.string().min(1).max(200),
            placeholder: z.boolean().default(false),
          }),
        )
        .max(4)
        .default([]),
    }),

    engineering: z.object({
      eyebrow,
      heading,
      body: paragraph,
      photo: pic,
      stats: z.array(statSchema).max(3).default([]),
      stripLabel: z.string().min(1),
      strip: z.array(pic).min(2).max(12),
    }),

    gallery: z.object({
      eyebrow,
      heading,
      /** Button and viewer labels, read by screen readers. */
      controls: z.object({
        previous: z.string().min(1).max(40),
        next: z.string().min(1).max(40),
        open: z.string().min(1).max(40),
        viewer: z.string().min(1).max(40),
        close: z.string().min(1).max(20),
        previousPhoto: z.string().min(1).max(40),
        nextPhoto: z.string().min(1).max(40),
        /** Shown before the place in the viewer caption, e.g. "Photo · SAEL". */
        credit: z.string().max(40),
      }),
      items: z
        .array(pic.extend({ title: z.string().min(1).max(40), place: z.string().min(1).max(60) }))
        .min(1),
    }),

    numbers: z.object({
      label: z.string().min(1),
      stats: z.array(statSchema).min(1).max(4),
      ticker: z.array(z.string().min(1).max(30)).min(1),
    }),

    projects: z.object({ eyebrow, heading }),

    audience: z.object({
      eyebrow,
      heading,
      label: z.string().min(1),
      tabs: z
        .array(pic.extend({ label: z.string().min(1).max(30), text: z.string().min(1).max(240) }))
        .min(2)
        .max(6),
    }),

    faq: z.object({
      eyebrow,
      heading,
      /** May use {phone}, {email} and {blog}. */
      intro: tokenText.max(240),
    }),

    contact: z.object({
      eyebrow,
      heading,
      intro: paragraph,
      background: pic,
      /** Background video in public/video; `background` is its poster image. */
      video: z
        .string()
        .regex(/^\/video\/[\w.-]+\.mp4$/, 'Choose an MP4 file from the videos folder'),
      form: z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        place: z.string().min(1),
        bill: z.string().min(1),
        billOptions: z.array(z.string().min(1).max(30)).min(2),
        interest: z.string().min(1),
        /** Must stay in step with the enquiry endpoint's allowed values. */
        interests: z.array(z.string().min(1).max(60)).min(1),
        message: z.string().min(1),
        /** Hint text inside the fields (v5 shows these instead of visible labels). */
        placeholders: z.object({
          name: z.string().max(40),
          phone: z.string().max(40),
          place: z.string().max(40),
          bill: z.string().max(40),
          message: z.string().max(60),
        }),
        consent: z.string().min(1).max(200),
        privacy: z.object({
          text: z.string().min(1).max(600),
          placeholder: z.boolean().default(false),
        }),
        submit: z.string().min(1).max(40),
        thankYou: z.string().min(1).max(200),
        whatsappLabel: z.string().min(1).max(40),
        whatsappMessage: z.string().min(1).max(300),
        /** Button text while the enquiry is being sent. */
        sending: z.string().min(1).max(40),
        /** Pages shown when the form is sent without JavaScript. */
        sentPage: z.object({
          title: z.string().min(1).max(60),
          backLabel: z.string().min(1).max(40),
        }),
        problemPage: z.object({
          title: z.string().min(1).max(80),
          /** May use {phone} and {email}. */
          text: tokenText.max(400),
          backLabel: z.string().min(1).max(40),
        }),
      }),
    }),

    dayNight: z.object({
      eyebrow,
      heading,
      text: paragraph,
      sliderLabel: z.string().min(1),
      day: pic.extend({ tag: z.string().min(1), text: z.string().min(1) }),
      night: pic.extend({ tag: z.string().min(1), text: z.string().min(1) }),
      credit: z.string().max(120),
    }),

    /** Short names for the progress pill (desktop), in page order, keyed by section id. */
    progress: z
      .array(z.object({ id: z.string().regex(/^[a-z][a-z-]*$/), label: z.string().min(1).max(24) }))
      .min(1),

    /** The /blog page, article pages and the RSS feed. */
    blog: z.object({
      /** Browser tab and search result title of /blog (the site name is added). */
      seoTitle: z.string().min(1).max(60),
      seoDescription: z.string().min(50).max(170),
      feedTitle: z.string().min(1).max(80),
      eyebrow,
      heading,
      intro: paragraph,
      filterLabel: z.string().min(1),
      allLabel: z.string().min(1),
      comingSoon: z.string().min(1),
      /** Must contain {minutes}. */
      readingTime: z.string().includes('{minutes}', { message: 'Keep {minutes} in the text' }),
      /** Read out by screen readers when a filter changes. */
      filterStatus: z.object({
        one: z.string().min(1),
        other: z.string().includes('{count}', { message: 'Keep {count} in the text' }),
      }),
      article: z.object({
        backLabel: z.string().min(1).max(40),
        byLabel: z.string().min(1).max(20),
        publishedLabel: z.string().min(1).max(30),
        updatedLabel: z.string().min(1).max(30),
        draftNotice: z.string().min(1).max(200),
        relatedHeading: heading,
        whatsappLabel: z.string().min(1).max(40),
        /** Prefilled WhatsApp text; {title} becomes the article title. */
        whatsappMessage: z.string().min(1).max(300),
      }),
    }),
  });
};

export type Sections = z.infer<ReturnType<typeof sectionsSchema>>;
