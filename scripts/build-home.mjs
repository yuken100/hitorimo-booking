// ホームページの元ファイル（bold.html）を、公開用の完全な HTML（public/index.html）に組み立てる
// 使い方: node scripts/build-home.mjs <bold.html のパス>
import { readFileSync, writeFileSync } from 'fs';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-home.mjs <path to bold.html>');
  process.exit(1);
}

const html = readFileSync(src, 'utf8');
const splitAt = html.indexOf('</style>') + '</style>'.length;
if (splitAt < '</style>'.length) throw new Error('</style> not found');

const headPart = html.slice(0, splitAt);
const bodyPart = html.slice(splitAt);

const description =
  '誰一人として、置き去りにしない社会を創る。HITORIMO（ヒトリモ）は、人を育てる経営者・リーダーと、夢を持つ起業家を、信頼関係の力で支えます。初回相談は無料です。';
const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23FFE03A'/%3E%3Ctext x='32' y='44' font-family='Arial Black,Arial,sans-serif' font-size='30' font-weight='900' text-anchor='middle' fill='%23141414'%3EMO%3C/text%3E%3C/svg%3E";

const out = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:title" content="HITORIMO — 誰一人として、置き去りにしない社会を創る。">
<meta property="og:description" content="${description}">
<meta property="og:locale" content="ja_JP">
<link rel="icon" href="${favicon}">
${headPart}
</head>
<body>
${bodyPart.trim()}
</body>
</html>
`;

writeFileSync(new URL('../public/index.html', import.meta.url), out);
console.log('public/index.html written', out.length, 'chars');
