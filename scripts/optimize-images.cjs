const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets', 'images');
const pages = ['index.html', 'classes.html', 'online-classes.html', 'instructor.html', 'contact.html', 'training.html', 'blog.html'];
fs.mkdirSync(output, { recursive: true });
const cache = new Map();
const report = [];
async function optimize(src) {
    if (cache.has(src)) return cache.get(src);
    if (/^(?:https?:|data:|assets\/images\/)/.test(src)) return null;
    const input = path.resolve(root, src);
    if (!input.startsWith(root + path.sep) || !fs.existsSync(input)) throw new Error('Missing or invalid image: ' + src);
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) return null;
    // Payment codes stay lossless and at their original resolution.
    const qr = /qr|payment/i.test(src);
    const icon = /icon|BOX1|logo|11\.02\.31/i.test(src);
    const maxWidth = qr ? meta.width : icon ? 400 : 1440;
    const slug = path.parse(src).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 65);
    const hash = crypto.createHash('sha256').update(src).digest('hex').slice(0, 8);
    const name = `${slug}-${hash}.webp`;
    const info = await sharp(input).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp(qr ? { lossless: true } : { quality: 84, effort: 5 }).toFile(path.join(output, name));
    const before = fs.statSync(input).size;
    let result = { src, width: meta.width, height: meta.height };
    if (info.size < before) {
        result = { src: 'assets/images/' + name, width: info.width, height: info.height };
        report.push({ original: src, optimized: result.src, before, after: info.size });
        if (!qr && !icon && info.width > 800) {
            const small = name.replace('.webp', '-640.webp');
            const smallInfo = await sharp(input).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(path.join(output, small));
            result.srcset = `assets/images/${small} ${smallInfo.width}w, ${result.src} ${info.width}w`;
        }
    }
    cache.set(src, result);
    return result;
}
(async () => {
    for (const file of pages) {
        let html = fs.readFileSync(path.join(root, file), 'utf8');
        const images = [...html.matchAll(/<img\b[^>]*>/g)];
        for (let i = 0; i < images.length; i++) {
            const original = images[i][0];
            const match = original.match(/\bsrc="([^"]+)"/);
            if (!match) continue;
            const result = await optimize(match[1]);
            let tag = original;
            if (result) {
                tag = tag.replace(/\bsrc="[^"]+"/, `src="${result.src}"`);
                if (!/\bwidth=/.test(tag)) tag = tag.replace(/>$/, ` width="${result.width}">`);
                // Existing width attributes (for example the 200px logo) retain their intended ratio.
                if (!/\bheight=/.test(tag)) {
                    const width = Number(tag.match(/\bwidth="(\d+)"/)[1]);
                    tag = tag.replace(/>$/, ` height="${Math.round(width * result.height / result.width)}">`);
                }
                if (result.srcset && !/\bsrcset=/.test(tag)) {
                    const sizes = /card-img-top/.test(tag) ? '(max-width: 767px) 90vw, (max-width: 991px) 50vw, 33vw' : '(max-width: 767px) 100vw, 1440px';
                    tag = tag.replace(/>$/, ` srcset="${result.srcset}" sizes="${sizes}">`);
                }
            }
            if (!/\bdecoding=/.test(tag)) tag = tag.replace(/>$/, ' decoding="async">');
            if (!/\bloading=/.test(tag)) tag = tag.replace(/>$/, ` loading="${i < 2 ? 'eager' : 'lazy'}">`);
            if (file === 'index.html' && i === 1 && !/\bfetchpriority=/.test(tag)) tag = tag.replace(/>$/, ' fetchpriority="high">');
            html = html.replace(original, tag);
        }
        html = html.replace(/<iframe\b[^>]*>/g, tag => /\bloading=/.test(tag) ? tag : tag.replace(/>$/, ' loading="lazy">'));
        html = html.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/g, tag => /\bdefer\b/.test(tag) ? tag : tag.replace('<script', '<script defer'));
        fs.writeFileSync(path.join(root, file), html);
    }
    if (report.length) fs.writeFileSync(path.join(output, 'optimization-report.json'), JSON.stringify(report, null, 2) + '\n');
    const before = report.reduce((sum, x) => sum + x.before, 0);
    const after = report.reduce((sum, x) => sum + x.after, 0);
    console.log(JSON.stringify({ optimizedImages: report.length, originalBytes: before, optimizedBytes: after, reductionPercent: before ? Math.round((1 - after / before) * 100) : 0 }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
