# Computer Angels website

Public website for Computer Angels Ltd (computerangels.co.uk).

- Plain HTML and CSS. No build step, no framework. The one exception is `worker/index.js`, a small script on Cloudflare that answers `/status.json` for automatic announcements (see below).
- Hosted on Cloudflare (Workers static assets) from `main`; settings are in `wrangler.jsonc`, old-address forwards in `_redirects`, and files kept off the public site in `.assetsignore`. Live at https://www.computerangels.co.uk since 13 Nov 2026; the address without www redirects to it (Cloudflare redirect rule). If GitHub Pages is still switched on for this repo, switch it off.
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

## Automatic announcements (StatusGator)

- `worker/index.js` asks StatusGator (free plan, three monitors) which watched services have problems, at most once every three minutes, and publishes ready-worded notices at `/status.json`.
- It also reads four official status feeds directly, with no token and no monitor limit: Google Workspace, Cloudflare, Amazon Web Services and Dropbox. These post for major outages only (never warnings). The rules for what counts as major are next to each feed in `worker/index.js`.
- The StatusGator token is a Cloudflare secret named `STATUSGATOR_TOKEN` (Workers & Pages, computerangels-website, Settings, Variables and Secrets). It is read-only and must never be put in this repository.
- Switch on or off with the `auto:` line in `announcement.txt`. Automatic notices are a strip only and clear by themselves: a service that is "down" gets a MODERATE strip, one with a "warn" status gets a LOW strip. If several services have problems the page shows the most serious and names the others. A hand-written notice always wins.
- To choose which parts of a service count (for example only Exchange and Teams), filter the monitor's components in StatusGator; no change is needed here.
- To see a sample, add `#psa-test`, `#psa-test-apple`, `#psa-test-apple-warn`, `#psa-test-cloudflare`, `#psa-test-aws` or `#psa-test-dropbox` to any page address. `/status.json` shows what the checker currently sees (`"configured": false` means the token is missing; `sources` shows which feeds answered).
- Wording for each service is in the `KNOWN` list at the top of `worker/index.js`.

## Sound credits

The party sounds on the 404 page are in `audio/`, supplied by Peter (file names suggest Pixabay): party blower by floraphonic, fireworks by DRAGON-STUDIO, applause and cheer by driken5482. Trimmed and re-encoded at 128 kbps. The story scene's music is `audio/story-theme.mp3`: "The Path of the Force" by luis_humanoide, full length at 96 kbps.

## Launch notes

- Have a solicitor check `terms.html` (plain-English redraft, Nov 2026) and `privacy-policy.html`.
- Optional: add the ICO registration number to the privacy policy.
- Done 13 Nov 2026: the "noindex" tag is removed from every page except `404.html`, which keeps it.
- Checked live 13 Nov 2026: all pages load, old addresses forward, the 404 page works, and repo files (README, wrangler.jsonc, _redirects) are not public.
- Still to do: submit `sitemap.xml` in Google Search Console and check the Google Business Profile points at the new pages.
- Only change the web DNS records (apex and `www`). Leave mail and Resend records alone.
