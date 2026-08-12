#!/usr/bin/env node
/**
 * generate-sitemap.js
 * ─────────────────────────────────────────────────────────────
 * Automatic sitemap generator for Shree Radha Raman Ji Vrindavan.
 *
 * Scans index.html for every top-level `<section id="...">` and
 * builds a fresh sitemap.xml with today's <lastmod> date — no
 * manual URL list to maintain. Run it locally with:
 *
 *   node scripts/generate-sitemap.js
 *
 * It is also wired into .github/workflows/sitemap.yml so the
 * sitemap regenerates itself automatically on every push to main.
 * ─────────────────────────────────────────────────────────────
 */
const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const HTML_FILE  = path.join(ROOT, 'index.html');
const OUT_FILE   = path.join(ROOT, 'sitemap.xml');
const SITE_URL   = 'https://vaishnavadiii786-ctrl.github.io/shree-vrindavan/';

// Priority / change-frequency hints per section id. Anything not
// listed here still gets included, just with sensible defaults.
const HINTS = {
  'hero':              { priority: '1.0', changefreq: 'daily',  skipAnchor: true },
  'about':             { priority: '0.7', changefreq: 'monthly' },
  'timings':           { priority: '0.9', changefreq: 'weekly' },
  'shloka-section':    { priority: '0.6', changefreq: 'daily' },
  'mala-section':      { priority: '0.6', changefreq: 'monthly' },
  'ashirwad-section':  { priority: '0.6', changefreq: 'monthly' },
  'festival-section':  { priority: '0.8', changefreq: 'monthly' },
  'panorama-section':  { priority: '0.7', changefreq: 'monthly' },
  'map-section':       { priority: '0.7', changefreq: 'yearly' },
  'youtube-section':   { priority: '0.6', changefreq: 'weekly' },
  'instagram-section': { priority: '0.6', changefreq: 'weekly' }
};
const DEFAULT_HINT = { priority: '0.5', changefreq: 'monthly' };

function extractSectionIds(html) {
  const ids = [];
  const re = /<section\s+[^>]*id="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.push(m[1]);
  return ids;
}

function buildUrlEntry(loc, { priority, changefreq }, extraXml = '') {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    extraXml,
    '  </url>'
  ].filter(Boolean).join('\n');
}

const today = new Date().toISOString().slice(0, 10);

function main() {
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`✗ Could not find ${HTML_FILE}`);
    process.exit(1);
  }

  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const sectionIds = extractSectionIds(html);

  const entries = [];

  // Home page entry (hero) gets hreflang + image tags.
  const homeHint = HINTS.hero;
  entries.push(buildUrlEntry(SITE_URL, homeHint,
    `    <xhtml:link rel="alternate" hreflang="en-IN" href="${SITE_URL}"/>\n` +
    `    <xhtml:link rel="alternate" hreflang="hi-IN" href="${SITE_URL}?lang=hi"/>\n` +
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}"/>\n` +
    `    <image:image>\n      <image:loc>${SITE_URL}og-image.jpg</image:loc>\n      <image:title>Shree Radha Raman Ji Vrindavan Dham</image:title>\n    </image:image>`
  ));

  sectionIds.forEach((id) => {
    if (id === 'hero') return; // already covered by the home entry
    const hint = HINTS[id] || DEFAULT_HINT;
    entries.push(buildUrlEntry(`${SITE_URL}#${id}`, hint));
  });

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${entries.join('\n\n')}

</urlset>
`;

  fs.writeFileSync(OUT_FILE, xml, 'utf8');
  console.log(`✓ sitemap.xml regenerated with ${sectionIds.length} sections (lastmod ${today})`);
}

main();
