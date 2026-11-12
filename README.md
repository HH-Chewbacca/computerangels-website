# Computer Angels website

Public website for Computer Angels Ltd (computerangels.co.uk).

- Plain HTML and CSS. No build step, no framework.
- Hosted on Cloudflare (Workers static assets) from `main`; settings are in `wrangler.jsonc`, old-address forwards in `_redirects`, and files kept off the public site in `.assetsignore`. GitHub Pages still serves a second preview copy.
- `html_handling` is `none` on purpose so pages keep their exact `.html` addresses. Do not change it without testing: the default strips `.html` with temporary redirects.
- Forms post to Web3Forms. The access key in the HTML is public by design.
- Page file names match the old site so existing addresses keep working.
- AngelSys (the internal CRM) is a separate system. This site does not link to it or talk to it.
- No email addresses on the site. Enquiries go through the contact form.

## Before launch

- Have a solicitor check `terms.html` (plain-English redraft, Nov 2026) and `privacy-policy.html`.
- Optional: add the ICO registration number to the privacy policy.
- Remove `<meta name="robots" content="noindex">` from every page.
- Add a `CNAME` file containing `www.computerangels.co.uk`.
- After launch: submit `sitemap.xml` in Google Search Console and check the Google Business Profile points at the new pages.
- Only change the web DNS records (apex and `www`). Leave mail and Resend records alone.
