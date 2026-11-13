# Computer Angels website

Public website for Computer Angels Ltd (computerangels.co.uk).

- Plain HTML and CSS. No build step, no framework.
- Hosted on Cloudflare (Workers static assets) from `main`; settings are in `wrangler.jsonc`, old-address forwards in `_redirects`, and files kept off the public site in `.assetsignore`. GitHub Pages still serves a second preview copy.
- `html_handling` is `none` on purpose so pages keep their exact `.html` addresses. Do not change it without testing: the default strips `.html` with temporary redirects.
- Forms post to Web3Forms. The access key in the HTML is public by design.
- Page file names match the old site so existing addresses keep working.
- AngelSys (the internal CRM) is a separate system. This site does not link to it or talk to it.
- No email addresses on the site. Enquiries go through the contact form.

## Posting a public service announcement

Everything is in one file: `announcement.txt`.

1. Open `announcement.txt` on GitHub and press the pencil (Edit).
2. Change the lines: `severity` (high, moderate or low), `scope`, `status`, `headline`, `happening`, `todo`, `updated`, and always an `expires` date.
3. Set `show: yes` and press "Commit changes". It is live on every page in about a minute.
4. To take it down, set `show: no` and commit.

- **High** pops up over the page once per visitor, then stays as a strip. **Moderate** and **low** are a strip only.
- If the file has a mistake (a misspelt severity, a missing headline) the site shows nothing rather than something broken, so check the live site after posting.
- A visitor who closes the strip will not see that announcement again. Changing the headline or the `updated` line counts as a new announcement and shows it to everyone again.

## Sound credits

The party sounds on the 404 page are in `audio/`, supplied by Peter (file names suggest Pixabay): party blower by floraphonic, fireworks by DRAGON-STUDIO, applause and cheer by driken5482. Trimmed and re-encoded at 128 kbps. The story scene's music is `audio/story-theme.mp3`: "The Path of the Force" by luis_humanoide, full length at 96 kbps.

## Before launch

- Have a solicitor check `terms.html` (plain-English redraft, Nov 2026) and `privacy-policy.html`.
- Optional: add the ICO registration number to the privacy policy.
- Remove `<meta name="robots" content="noindex">` from every page.
- Add a `CNAME` file containing `www.computerangels.co.uk`.
- After launch: submit `sitemap.xml` in Google Search Console and check the Google Business Profile points at the new pages.
- Only change the web DNS records (apex and `www`). Leave mail and Resend records alone.
