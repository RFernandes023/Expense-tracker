// Gera um único ficheiro HTML autocontido (JS, CSS e ícone embutidos) em dist-artifact/carteira-pt.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = 'dist-artifact';
let html = readFileSync(`${dir}/index.html`, 'utf8');
const assets = readdirSync(`${dir}/assets`);
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/assets/${f}`, 'utf8'));
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/assets/${f}`, 'utf8')).join('\n');
if (js.length !== 1) throw new Error(`Esperado 1 bundle JS, encontrados ${js.length}`);
const icon = 'data:image/svg+xml;base64,' + readFileSync('public/icon.svg').toString('base64');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const out = `<title>Carteira PT</title>
<meta name="theme-color" content="#0f766e" />
<link rel="icon" href="${icon}" type="image/svg+xml" />
<style>${css}</style>
${body.trim()}
<script type="module">${js[0].replaceAll('</script', '<\\/script').replaceAll('./icon.svg', icon)}</script>
`;
writeFileSync(`${dir}/carteira-pt.html`, out);
console.log(`${dir}/carteira-pt.html`, (out.length / 1024).toFixed(0) + ' KB');
