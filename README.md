# Computer Angels website

Public website for Computer Angels Ltd (computerangels.co.uk).

- Plain HTML and CSS. No build step, no framework.
- Hosted on GitHub Pages from `main` (root).
- Forms post to Web3Forms. The access key in the HTML is public by design.
- Page file names match the old site so existing addresses keep working.
- AngelSys (the internal CRM) is a separate system. This site does not link to it or talk to it.
- No email addresses on the site. Enquiries go through the contact form.

## Before launch

- Have a solicitor check `terms.html` (plain-English redraft, Nov 2026) and `privacy-policy.html`.
- Optional: add the ICO registration number to the privacy policy.
- Remove `<meta name="robots" content="noindex">` from every page.
- Add a `CNAME` file containing `www.computerangels.co.uk`.
- Only change the web DNS records (apex and `www`). Leave mail and Resend records alone.
