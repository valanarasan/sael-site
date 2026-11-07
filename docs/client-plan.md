# SAEL Website v5 · Development Plan

Nov 3, 2026 · @Team

## Summary

The revised v5 site is built from SAEL's updated site map and its own project photos, and is ready for SAEL to review. It now has two pages: the home page (index.html) and a new Blog page (blog.html), delivered together as SAEL-v5-site.zip.

- **Removed:** the Products section and all mentions of solar atta chakki and solar water heater. The Ghana project is gone too, so the site now shows South India only.
- **Added:** a Blog page with 14 article cards, a state top-up option in the subsidy calculator, and a five-step How it works section.
- **Photos:** SAEL's own photos replace the stock images. 30 photos were upscaled with AI and placed through the page, alongside the SAEL logo, a favicon and SAEL's rooftop video.
- **Waiting on SAEL:** headlines, the Why SAEL tiles, the numbers band, engineering figures, the blog articles and a second phone number. These are marked “Content from SAEL” or “Figure from SAEL” on the page.

The next step is a content round with SAEL, then the production build, the blog articles, testing and launch. The proposed target is launch by the week of 14 December 2026.

## Changes made from SAEL's site map

Every comment, strikethrough and insertion in SAEL Site Map v5 (latest) has been applied or is marked for SAEL's content.

| Area | SAEL's note | What changed in v5 |
| --- | --- | --- |
| Menu and top bar | Remove Products, add Blog | Products link removed. Blog added to the top bar, menu and footer. Sections renumbered 01 to 11. |
| Hero | Remove pump, water heater and atta chakki slides; keep only the ₹78,000 fact; headline will change | Five slides with SAEL photos: Homes, Rooftop solar, Shops & offices, Hybrid & battery, AMC & service. Key facts cut to “₹78,000 max central home subsidy”. Intro text no longer lists removed products. |
| Products section | Remove the whole section | Removed, with its scripts and links. Footer column renamed Solutions. |
| Compare systems | (follows product removal) | Links to water heater, pump and atta chakki replaced with a commercial and industrial link. |
| Subsidy | Add extra state subsidy | Calculator now has a state list and shows central + state + total. State figures are kept in one table in the code so they are easy to update. |
| How it works | Four steps become five | Book a survey, System design, Installation, Subsidy & net metering, AMC & service. |
| Why SAEL | New content to come | Old tile text removed. SAEL photo in the large tile; four tiles marked “Content from SAEL”. |
| Engineering | Remove 24 MW badge, 200 MW and 20 MW | Badge and both figures removed. 3 offices kept; two slots marked “Figure from SAEL”. SAEL photos in the photo strip. |
| Numbers band | Will change completely | Three slots marked “Figure from SAEL”. 3 offices kept. |
| Projects | South India only | Ghana removed. Heading is now “Projects across South India”. Feature card shows SAEL's own installations. |
| Who it's for | (follows product removal) | “Mills & hostels” replaced with “Industries”. All four tabs use SAEL photos. |
| FAQs | (follows product removal) | Atta chakki and water heater questions replaced with two SAEL questions: “Can a grid-tie system run on its own?” and “Will solar power leave my building?” |
| Contact form | Remove off-grid, atta chakki, water heater, submersible pump | Interest list is now On-grid, Hybrid with battery, Commercial or industrial. Background is SAEL's rooftop video. |
| Chat assistant | Remove atta chakki and water heater buttons; add blog | Buttons removed. Asking about them gets a polite “we don't supply these”. New “Low output” button. Answers link to related blog articles. |
| Blog | New page with 14 titles | Built as blog.html. See the Blog section below. |

## Content needed from SAEL

The build can't be finished until SAEL sends the items below. The proposed deadline for all of them is 14 November 2026.

- [ ] **All section headlines.** SAEL said every headline will change. Send one line per section: hero, Compare, Subsidy, How it works, Why SAEL, Engineering, Gallery, Projects, Who it's for, FAQs, Contact.
- [ ] **Why SAEL tiles.** One main line plus four short points, each with a title and one sentence.
- [ ] **Numbers band.** Three figures with labels, for example years in business, systems installed or kW installed. Only real figures will be used.
- [ ] **Engineering text and two figures.** A short paragraph and two numbers to sit beside “3 offices”.
- [ ] **Blog articles.** Text for the 14 titles, or a first batch of 4 to 6 for launch.
- [ ] **Second phone number.** And which office or purpose it is for.
- [ ] **WhatsApp number for the chat assistant.** It currently uses +91 98807 03083.
- [ ] **Project details.** Name, location, size and year for each project to show, plus which photo belongs to which project.
- [ ] **Product claims to confirm.** Tier-1 panels and BIS-certified parts (mentioned in the Engineering text), and what the AMC covers.
- [ ] **Photo consent.** Confirm SAEL owns the photos and has the homeowners' OK to show their homes online.

## Points to confirm

A few parts of the site map pull in different directions. The site currently follows the choice in the middle column until SAEL says otherwise.

| Question | What v5 does now | Why it needs a decision |
| --- | --- | --- |
| Does SAEL still offer solar pumps? | Pumps stay in the chat assistant, the FAQ and the Farms tab | Pumps were struck from the hero and the contact form, but not from the chat or FAQ. SAEL's own photos show pump installations at Bhoganahalli. |
| Does SAEL offer off-grid systems? | Off-grid stays in the Compare table and finder | It was struck from the contact form only. |
| Which state top-ups to show? | Karnataka, Kerala, Tamil Nadu, Uttar Pradesh, Delhi, Goa and “Other states” | SAEL works in South India, but most top-ups found so far are in other states. Figures are from public sources and change often. |
| Tamil Nadu top-up | Shown as a note, not added to the total | The 2026 budget announced up to ₹1 lakh, but the guidelines haven't been issued. |
| Delhi and Goa figures | Delhi ₹10,000 per kW up to 3 kW; Goa shown as a note | The Delhi figure comes from a news report; Goa's amount is set by GEDA. |
| New Zealand office | Still listed in the footer, contact and numbers band | The site map now says South India for projects. Confirm the NZ office should stay. |
| Brand colours | Teal and copper from the earlier concept | The SAEL logo is green and blue. The site could switch its accent colours to match the logo. |
| Project cards | Three power-facilitation projects keep stock photos | These were not SAEL installs, so SAEL photos weren't used. Real project photos would be better. |

## Phases and timeline

The proposed launch is the week of 14 December 2026. That date holds only if SAEL's content arrives by 14 November; each week of delay moves launch by about a week.

&#91;embedded content: proposed plan · 5 phases, 2 milestones\]

1. **SAEL review and content (2 to 14 November).** SAEL reviews this v5, answers the points to confirm and sends the content listed above.
2. **Production build (16 to 28 November).** Move to a proper project, add the final content, connect the contact form, set up the password-protected Vercel preview and convert images to WebP.
3. **Blog articles (23 November to 5 December).** Build the article page template and publish the first batch of 4 to 6 articles.
4. **Testing and sign-off (30 November to 11 December).** Run the testing checklist below, fix issues, and get SAEL's written OK.
5. **Launch (week of 14 December).** Point the domain, add redirects, submit the sitemap to Google and check enquiries arrive.

## Blog

blog.html lists all 14 titles from the site map as cards marked “Article coming soon”, with filters by topic. Each card has its own link (for example blog.html#om-amc), so the chat assistant can point to it today and to the full article later. Titles were lightly copy-edited for grammar.

| Topic | Articles |
| --- | --- |
| Subsidy & schemes | What is PM Surya Ghar Yojana? · PM Surya Sarovar Yojana |
| Solar basics | Why are solar panels installed at an angle? · Why Indian homes and businesses are choosing solar · A practical guide to the different types of solar plants · The “zero electricity bill” lie |
| Monsoon | Why the monsoon is the real challenge for a solar plant · Solar panels in the monsoon: what really happens when the sun is not there? |
| Performance | Why has my solar output dropped since last year? · Why and how dirty solar panels drain generation · 5 signs your current solar plant is underperforming · The microcrack myth |
| O&M & AMC | How solar O&M and AMC improve output and efficiency · How smart businesses are using SAEL energy services |

**Publishing.** In the production build, each article becomes its own page with its own address, for example /blog/om-amc. Each page gets a title, description and share image, so it can show up in Google and look right when shared on WhatsApp. Two ways to publish:

1. **The developer publishes.** SAEL sends each article as a Word or Google Doc, and the developer adds it. This is simplest and costs nothing extra.
2. **SAEL publishes.** A small editor (for example the free, open-source Decap CMS) lets SAEL staff add and edit posts in a browser. This takes extra setup time and needs a staff member to own it.

**To confirm:** the name “PM Surya Sarovar Yojana”. If SAEL means a different scheme, such as PM-KUSUM for farm pumps, the title should match it.

## Images and video

SAEL sent 52 photos, a logo and a short video. 30 of the best photos were upscaled with Real-ESRGAN, an AI model that sharpens and enlarges images, to between 900 and 2,880 pixels wide. Smaller 1,200-pixel copies were made for phones, so mobile visitors don't download the large files.

| Where | Photos used |
| --- | --- |
| Hero (5 slides) | Chennai rooftop, Bengaluru rooftop, commercial roof, inverter and DB box, cleaning crew |
| Why SAEL, Engineering, Projects | Sunset home, elevated structure, ground-mount array |
| Photo strip (6) | Wi-Fi monitor, wall inverter, pump controller, cleaning brush, tilted panels, sloping roof |
| Gallery (6) | Elevated array, tiled-roof villa, pump array (Bhoganahalli), Chennai, garden home, Bengaluru |
| Who it's for (4) | Villa roof, wide commercial array, farm pump array, elevated structure |
| Blog cards | Reuses the photos above, plus a pergola, cleaning and rooftop cabin shots |
| Contact section | SAEL's rooftop video, silent and looping, with a still image as backup |

**Cleaned up before use:** GPS stamps, date stamps and a camera-app watermark were cropped out. A person's face was cropped out of the pergola photo. Two photos with a finger over the lens were left out.

**Still needed from SAEL:**

- Photos matched to named projects, so the Projects section can show real sites.
- A longer or higher-quality video, if one exists. The current clip is 480p and looks soft as a full-width background.
- The logo as a vector file (SVG or PDF), for a sharper header and favicon.
- Optionally, a few photos with the SAEL team on site, which work well in the hero and the Why SAEL section.

The image folder is about 18 MB. In the production build, images will be converted to WebP so the site loads faster.

## Hosting, testing and launch

The site will run on Vercel as a static site, with a password-protected preview link for SAEL's review before launch. The production build moves the page from one long HTML file into a small project with shared styles, so the home page, blog and article pages stay in step.

**Before launch, these need to work:**

- [ ] Contact form sends each enquiry to SAEL by email or WhatsApp. Today it only shows a thank-you message.
- [ ] Domain saelenergy.com points to the new site, with old page addresses redirected so Google links don't break.
- [ ] Google Analytics or Vercel Analytics installed, plus Google Search Console with a sitemap.
- [ ] Page titles, descriptions and share images on every page.
- [ ] Privacy note for the contact form, since it collects names and phone numbers.

**Testing checklist:**

- [ ] Phones (Android and iPhone) and desktop (Chrome, Safari, Edge).
- [ ] Subsidy calculator for every state and size from 1 to 10 kW.
- [ ] Chat assistant: each button, WhatsApp hand-off and blog links.
- [ ] Contact form: required fields, Indian mobile number check, enquiry received.
- [ ] Accessibility: keyboard use, readable contrast, reduced-motion setting.
- [ ] Speed: home page loads quickly on a 4G phone connection.

The current v5 already passes the basic checks in testing: no script errors, no sideways scrolling on a 390-pixel phone screen, five hero slides, five steps, the three form options, and correct calculator totals. For example, 3 kW in Uttar Pradesh comes to ₹78,000 + ₹30,000 = ₹1,08,000.
