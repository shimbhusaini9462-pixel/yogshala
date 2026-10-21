// Run after choosing the production domain: node scripts/configure-seo.cjs https://your-domain.com
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const supplied = process.argv[2];
let base;
if (supplied) {
  const url = new URL(supplied);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error('Provide a public HTTPS domain without a path, query, or credentials.');
  }
  base = url.origin;
}
const pages = [
  ['faq.html', 'Yoga Classes FAQs | Yogshala Jaipur', 'Answers about Yogshala Jaipur classes, fees, packages, payments, live online yoga and student accounts.'],
  ['index.html', 'Yoga Classes in Jaipur & Online | Yogshala Jaipur', 'Explore yoga classes in Jaipur and live online sessions at Yogshala. Discover yoga therapy, meditation and teacher training. Call +91 7689941298.'],
  ['classes.html', 'Offline Yoga Classes in Jaipur | Yogshala Jaipur', 'Explore offline yoga classes at Yogshala Jaipur. View class schedules, timings and fees, and contact our team to find a session that suits you.'],
  ['online-classes.html', 'Live Online Yoga Classes | Yogshala Jaipur', 'Practice yoga from home with Yogshala live online classes. Explore membership plans, upcoming sessions and guided yoga for different experience levels.'],
  ['instructor.html', 'Yoga Instructors in Jaipur | Yogshala Jaipur', 'Meet Yogachariya Sanjay Saini and the Yogshala Jaipur team. Learn about our instructors and their approach to yoga, alignment and personalized guidance.'],
  ['contact.html', 'Contact Yogshala Jaipur | Yoga Class Enquiries', 'Contact Yogshala Jaipur for yoga classes, online sessions and teacher training enquiries. Call +91 7689941298 or use our enquiry form.'],
  ['training.html', 'Yoga Teacher Training in Jaipur | Yogshala Jaipur', 'Explore 200-hour, 300-hour and specialized yoga teacher training at Yogshala Jaipur. Learn about course options, yoga alignment and teaching methodology.'],
  ['blog.html', 'Yoga Articles & Practice Tips | Yogshala Jaipur', 'Explore yoga articles from Yogshala Jaipur with practice tips and information about yoga poses, breathing and meditation.'],
];
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
for (const [file, title, description] of pages) {
  const target = path.join(root, file);
  let html = fs.readFileSync(target, 'utf8');
  // Preserve a previously configured domain when running the domain-free update again.
  const existing = html.match(/<link rel="canonical" href="(https:\/\/[^"\s]+)"/);
  const origin = base || (existing ? new URL(existing[1]).origin : undefined);
  const pageUrl = origin ? origin + (file === 'index.html' ? '/' : '/' + file) : undefined;
  html = html.replace(/\s*<!-- SEO START -->[\s\S]*?<!-- SEO END -->/g, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  html = html.replace(/content="width=device-width, initial-scale=1\.0, maximum-scale=1\.0, user-scalable=no"/g, 'content="width=device-width, initial-scale=1.0"');
  const tags = [
    `<meta name="description" content="${escape(description)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Yogshala Jaipur">',
    '<meta property="og:locale" content="en_IN">',
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${escape(title)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
  ];
  if (pageUrl) {
    tags.push(`<link rel="canonical" href="${escape(pageUrl)}">`, `<meta property="og:url" content="${escape(pageUrl)}">`);
    const image = origin + '/' + encodeURIComponent('WhatsApp Image 2025-12-09 at 11.02.31_5b46d880.jpg');
    tags.push(`<meta property="og:image" content="${image}">`, '<meta property="og:image:alt" content="Yogshala Jaipur logo">', `<meta name="twitter:image" content="${image}">`);
  }
  if (file === 'index.html' || file === 'contact.html') {
    const business = {
      '@context': 'https://schema.org', '@type': 'ExerciseGym', name: 'Yogshala Jaipur',
      description: 'Yoga classes in Jaipur, live online yoga sessions and yoga teacher training.',
      telephone: '+917689941298',
      address: { '@type': 'PostalAddress', addressLocality: 'Jaipur', addressRegion: 'Rajasthan', addressCountry: 'IN' },
      sameAs: ['https://www.facebook.com/share/18HMVuKacf/', 'https://www.instagram.com/yogshala_jaipur/', 'https://youtube.com/@yogshala-jaipur'],
    };
    if (origin) Object.assign(business, { '@id': origin + '/#yogshala', url: origin + '/' });
    tags.push('<script type="application/ld+json">\n' + JSON.stringify(business, null, 2) + '\n</script>');
    if (file === 'index.html' && origin) {
      tags.push('<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Yogshala Jaipur', url: origin + '/' }) + '</script>');
    }
  }
  html = html.replace(/<\/title>/, '</title>\n    <!-- SEO START -->\n    ' + tags.join('\n    ') + '\n    <!-- SEO END -->');
  fs.writeFileSync(target, html);
}
if (base) {
  const urls = pages.map(([file]) => base + (file === 'index.html' ? '/' : '/' + file));
  fs.writeFileSync(path.join(root, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n') + '\n</urlset>\n');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').replace(/\nSitemap:.*\n?/g, '\n').trimEnd();
  fs.writeFileSync(path.join(root, 'robots.txt'), robots + '\n\nSitemap: ' + base + '/sitemap.xml\n');
}
console.log('Updated SEO for ' + pages.length + ' public pages.' + (base ? ' Canonicals and sitemap configured.' : ' Domain URLs omitted until a production domain is supplied.'));
