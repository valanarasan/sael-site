# Editing the SAEL website

This guide is for SAEL staff. You edit the website through **Pages CMS**, a set of forms in your browser. You don't need to touch any code.

## Getting in

1. Open the invitation email from Pages CMS and follow the link.
2. Open the SAEL website project.
3. Use the menu on the left to choose what to edit:

| Menu item | What it holds |
|---|---|
| **Settings** | Phone numbers, WhatsApp, email, offices, menus, footer |
| **Home page** | The text and photos of each home-page section, one form per section |
| **Blog articles** | Every article |
| **Projects** | The project cards |
| **FAQs** | Questions and answers |
| **Subsidy rates** | Central and state subsidy figures used by the calculator |
| **Chat assistant** | The answers the chat gives |
| **Media** | All photos and videos |

## How saving works

When you press **Save**, the change is recorded and the live website rebuilds by itself. It usually appears within a few minutes.

Before the site updates, the build checks your change. If something is wrong, such as a missing required field, **the live site stays exactly as it was**, so a mistake can't take the website down. If your change hasn't appeared after 10 minutes, ask your developer to check the build.

Every save is kept, so any earlier version can be restored. Ask your developer if you need one back.

## Add a blog article

1. Go to **Blog articles** and press **Add an entry**.
2. Fill in **Title**, **Topic**, **Cover photo** and **Photo description**.
3. Write the article in the **Article** box. Use the toolbar for headings, lists and links, and to add photos.
4. Check the file name near the top. It becomes the web address, so keep it short: `monsoon-output` rather than a whole sentence. **Don't change it after publishing**, because links to the article would stop working.
5. Leave **Draft** on until the article is ready, then press **Save**. Drafts show on the blog as "Article coming soon" cards and have no page of their own.

### Publish it

1. Open the article and turn **Draft (not published yet)** off.
2. Fill in **Summary** (50 to 170 characters) and **Publish date**. Both are needed to publish; without them the build stops and the site doesn't change.
3. Press **Save**. The article gets its own page, its card links to it, and it appears in the RSS feed.

## Change a phone number

1. Go to **Settings**.
2. Under **Main contact details**, change the number in **both** places:
   - **Number as shown on the site**, written how you'd like people to read it: `+91 98807 03083`
   - **Number for tap-to-call**, with no spaces: `+919880703083`
3. If the WhatsApp number changed too, update **WhatsApp number**. It takes digits only with no plus sign: `919880703083`.
4. If it's an office's number, change it under **Offices** as well. The footer and contact section show those.
5. Press **Save**.

The number is only typed here. Chat answers and other text pick it up automatically, so you won't need to change it anywhere else.

## Swap a photo

1. Open the form that shows the photo. For example: **Home page**, then **Gallery**, then the photo in the list.
2. Under **Photo**, remove the current one, then either choose one from the library or upload a new one.
3. Update **Photo description** to match the new photo. This is what people using screen readers hear, so describe what's in it: "Rows of solar panels on a flat roof in Kochi".
4. Press **Save**.

Good to know:

- **Upload the original photo.** The website makes smaller, faster copies by itself, so you don't need to resize it. Under 10 MB is plenty.
- **JPG, PNG, WebP and AVIF** files work.
- **Don't delete a photo from Media** unless you're sure nothing uses it. If something still does, the build stops until the photo is put back.
- Media shows two photo tabs. They are the same folder, so an upload in either appears in both.

## Change a subsidy rate

1. Go to **Subsidy rates**.
2. To change a central rate, open **Central subsidy**, then **Slabs**. Today's rates are:

   | From (kW) | Up to (kW) | Rupees per kW |
   |---|---|---|
   | 0 | 2 | 30000 |
   | 2 | 3 | 18000 |

   Type numbers without commas or the ₹ sign. Each slab must start where the one before it ends.
3. Update **Maximum central subsidy (rupees)** if the ceiling changed. Today it's 78000.
4. To change a state's top-up, open it under **States**:
   - **Top-up in rupees per kW**: the amount per kW. Leave it empty for a state that only has a note.
   - **Top-up stops at this many kW** or **Maximum top-up (rupees)**: the limit, if there is one.
   - **Note under the result**: keep this in step with the numbers, because the calculator doesn't write it for you.
5. To add a state, add an entry with a two-letter code, such as `AP`, and the state's name.
6. Press **Save**, then try the calculator on the live site.

The rates also appear in written text. If a rate changes, search these for the old figure too: **FAQs**, **Chat assistant** and **Home page > Hero**.

## Other common edits

**Add an FAQ.** Go to **FAQs** and add an entry. The order in the list is the order on the page.

**Add a chat answer.** Go to **Chat assistant**, open **Answers** and add an entry. Give it a **Short name**, some **Words that trigger this answer** and the **Answer**. To check it, open the chat on the site and type one of those words.

**Add a project.** Go to **Projects** and add an entry. South India projects only. Lower **Position** numbers come first.

## Special writing rules

A few fields have their own small rules. The form tells you if one isn't followed.

- **\*Asterisks\*** in headings set those words in the serif italic style: `all *around* us`. They must come in pairs.
- **{curly brackets}** fill in details automatically. In the text fields that allow them, `{phone}`, `{email}`, `{whatsapp}`, `{offices}` and `{blog}` become the current details from Settings. If a field says "Keep {state}" or "Keep {amount}", leave that word as it is.

## Placeholders

Some text and figures are still waiting for real content from SAEL. They show a small dashed **Content from SAEL** or **Figure from SAEL** tag on the live site.

Once you've put in the real text, turn off **Still a placeholder** on that item and the tag disappears. Please don't turn it off until the real content is in.

## Please don't add

SAEL has decided these should not appear on the website:

- A Products section
- Solar atta chakki or solar water heaters
- The Ghana project
- The 24 MW, 200 MW and 20 MW figures

## When something goes wrong

| What you see | What to do |
|---|---|
| The form won't save and shows a red message | Fix the field it points to. The message says what it needs. |
| Saved, but the site hasn't changed after 10 minutes | The build probably stopped. The site is safe and still showing the last good version. Ask your developer. |
| A photo looks wrongly cropped | Try a photo with more space around the subject. Each spot on the page crops to its own shape. |
| You changed something by mistake | Change it back and save, or ask your developer to restore the earlier version. |

---

## For the developer: setting this up

Not for editors. This needs doing once, after the repository is on GitHub:

1. Sign in at [app.pagescms.org](https://app.pagescms.org) with GitHub and install the Pages CMS GitHub App on the account that owns the repository.
2. Open the repository. Pages CMS reads `.pages.yml` from the branch you open, so open `main`.
3. Invite SAEL's editors by email from the Collaborators page.
4. Do a test edit on each form before handing over, ideally with someone from SAEL, and check that the site still builds.
5. Protect `main` on GitHub so a failing build check can't go live, and make sure the host deploys only after the checks pass.

When a content schema changes, update `.pages.yml` to match. `tests/unit/pages-config.test.ts` fails until the two agree.
