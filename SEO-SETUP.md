# SEO setup

Public pages have unique titles and descriptions, social preview metadata, and one H1 per page. The homepage and contact page include business structured data using the known city and phone number. No street address, ratings, or opening hours have been invented.

When the production HTTPS domain is ready, run from the project folder:

```powershell
node scripts/configure-seo.cjs https://your-domain.com
```

Replace the example with the actual domain. This updates the seven public pages with absolute canonical URLs and social preview URLs, generates `sitemap.xml`, and adds its URL to `robots.txt`. Rerunning it preserves the page content.

Deploy the updated pages, `robots.txt`, and `sitemap.xml` together. Verify the domain in Google Search Console and submit `/sitemap.xml`. Confirm the exact studio street address and opening hours before extending the business structured data. Confirm the correct email address too: existing page content uses both a hyphen and a dot in the mailbox name.

The legacy `online class.html` page is marked `noindex, follow`; navigation uses `online-classes.html`. Robots rules limit crawling of backend paths; actual access protection remains the server's responsibility.

Reference: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
