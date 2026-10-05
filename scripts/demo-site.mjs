import http from 'node:http';
import {pathToFileURL} from 'node:url';

const HOST = '127.0.0.1';
const TITLE = 'Reinforced Computer Use demo';

const styles = `
  :root { color-scheme: light; --ink:#123d36; --muted:#52665e; --paper:#f7f5ee; --line:#d7ddd2; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.65 system-ui, sans-serif; }
  h1,h2,h3,p { margin:0; }
  a { color:inherit; text-decoration:none; }
  a:focus-visible { outline:3px solid #e89621; outline-offset:7px; }
  .wrap { width:min(1120px,calc(100% - 80px)); margin:auto; }
  .masthead { height:90px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); }
  .brand { font-size:17px; font-weight:800; letter-spacing:-.5px; display:flex; align-items:center; gap:12px; }
  .brand-icon { width:28px; height:28px; border:7px solid var(--ink); border-radius:9px; transform:rotate(-8deg); }
  .meta,.eyebrow,.marker { font-size:12px; font-weight:750; letter-spacing:1.8px; text-transform:uppercase; }
  .meta { color:var(--muted); }
  .hero { padding:76px 0 70px; display:grid; grid-template-columns:1.16fr 1fr; gap:58px; align-items:center; }
  .eyebrow { color:#677b63; margin-bottom:24px; }
  h1 { font-size:clamp(42px,5.4vw,66px); line-height:1.06; letter-spacing:-3px; font-weight:750; }
  .intro { font-size:18px; line-height:1.7; color:var(--muted); max-width:490px; margin-top:26px; }
  .button { display:inline-flex; align-items:center; background:var(--ink); color:#fff; padding:14px 28px; margin-top:30px; border-radius:6px; font-weight:700; }
  .small { font-size:13px; color:var(--muted); margin-top:15px; }
  .visual { position:relative; padding:27px; min-height:352px; background:#163f37; border-radius:20px; color:#edf5d8; overflow:hidden; }
  .visual::before { content:''; position:absolute; width:260px; height:260px; border:1px solid #6d8270; border-radius:50%; right:-84px; top:-74px; box-shadow:0 0 0 42px #244b42,0 0 0 43px #536f58,0 0 0 84px #244b42; }
  .visual > * { position:relative; }
  .visual-label { font:11px/1.5 ui-monospace,monospace; letter-spacing:1px; opacity:.8; }
  .workflow { margin-top:46px; display:flex; flex-direction:column; align-items:flex-start; gap:15px; }
  .workflow-row { background:#f1f4de; color:var(--ink); border-radius:8px; padding:12px 18px; width:85%; font-weight:750; display:flex; justify-content:space-between; }
  .workflow-row:nth-child(2) { margin-left:20px; background:#bfdfca; }
  .workflow-row:nth-child(3) { margin-left:40px; background:#d8e784; }
  .workflow-row span { opacity:.65; font:12px/1.7 ui-monospace,monospace; }
  .visual-foot { margin-top:25px; font-size:12px; opacity:.7; }
  .facts { display:grid; grid-template-columns:repeat(3,1fr); gap:32px; border-top:1px solid var(--line); padding:30px 0 44px; }
  .fact-number { font-size:24px; line-height:1.2; font-weight:750; }
  .fact-label { font-size:13px; color:var(--muted); margin-top:9px; }
  .note { padding:28px 0; border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  .long-hero { padding:65px 0 70px; }
  .long-hero h1 { max-width:730px; }
  .long-hero .intro { max-width:630px; }
  .legend { display:flex; gap:12px; margin-top:28px; flex-wrap:wrap; }
  .pill { border:1px solid var(--line); border-radius:40px; padding:6px 13px; font-size:12px; color:var(--muted); }
  .chapter { min-height:585px; padding:66px 0; border-top:1px solid #cdd6cc; background:var(--tint); }
  .chapter-grid { display:grid; grid-template-columns:88px 1fr 340px; gap:34px; align-items:start; }
  .chapter-index { font-size:60px; line-height:1; font-weight:700; letter-spacing:-3px; color:var(--accent); opacity:.75; }
  .marker { display:inline-block; color:var(--accent); background:#ffffff70; border:1px solid #ffffffa0; padding:5px 11px; border-radius:4px; margin-bottom:24px; font:12px/1.6 ui-monospace,monospace; letter-spacing:1px; }
  h2 { font-size:38px; line-height:1.15; font-weight:750; letter-spacing:-1.5px; max-width:470px; }
  .chapter-copy { color:var(--muted); margin-top:20px; max-width:475px; }
  .chapter-detail { margin-top:25px; padding-top:19px; border-top:1px solid #123d361c; font-size:13px; color:var(--muted); }
  .diagram { background:#ffffff8f; border:1px solid #ffffffb0; border-radius:14px; padding:26px; margin-top:36px; min-height:235px; box-shadow:0 12px 28px #123d3607; }
  .diagram-label { font:11px/1.5 ui-monospace,monospace; color:var(--muted); margin-bottom:24px; letter-spacing:.6px; }
  .bars { display:flex; align-items:flex-end; gap:13px; height:115px; border-bottom:1px solid #123d3622; }
  .bar { flex:1; background:var(--accent); border-radius:5px 5px 0 0; opacity:var(--opacity); height:var(--height); }
  .diagram-caption { font-size:12px; color:var(--muted); margin-top:14px; }
  .finish { padding:76px 0 65px; background:var(--ink); color:#f4f5e8; }
  .finish .marker { color:#e0edac; background:#ffffff0a; border-color:#ffffff20; }
  .finish h2 { max-width:650px; font-size:44px; }
  .finish p { color:#c4d4c7; max-width:650px; margin-top:20px; }
  .finish .footer-meta { font:12px/1.6 ui-monospace,monospace; margin-top:30px; color:#a6bdac; }
  @media (max-width:800px) {
    .wrap { width:calc(100% - 40px); } .masthead { height:76px; }
    .meta { font-size:10px; letter-spacing:.4px; } .brand { font-size:14px; }
    .hero { grid-template-columns:1fr; padding:45px 0; gap:35px; } h1 { letter-spacing:-2px; }
    .facts { gap:18px; } .fact-number { font-size:20px; }
    .chapter { padding:45px 0; } .chapter-grid { grid-template-columns:50px 1fr; gap:16px; }
    .chapter-index { font-size:40px; } h2 { font-size:32px; }
    .diagram { grid-column:2; margin-top:10px; min-height:210px; }
    .long-hero { padding:45px 0; }
  }
`;

function page(body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title><style>${styles}</style></head><body>${body}</body></html>`;
}

function masthead(isLong = false) {
  return `<header class="wrap masthead"><div class="brand"><span class="brand-icon" aria-hidden="true"></span>Reinforced Computer Use</div>
  ${isLong ? '<a class="meta" href="/">Home</a>' : '<span class="meta">Local demo / 01</span>'}</header>`;
}

const home = page(`${masthead()}
<main class="wrap">
  <div class="hero"><div>
    <p class="eyebrow">Observe. Act. Verify.</p>
    <h1>A small demo.<br>A complete view.</h1>
    <p class="intro">Try a bounded browser task on a synthetic page. Open twelve colorful sections, capture the full page, and check the ending.</p>
    <a class="button" href="/long">Long page</a>
    <p class="small">Local plan mode · No API key needed</p>
  </div><div class="visual" aria-label="Observe, act, and verify workflow illustration">
    <p class="visual-label">REINFORCED COMPUTER USE / DEMO</p>
    <div class="workflow"><div class="workflow-row">Observe <span>01 / read the page</span></div>
    <div class="workflow-row">Act <span>02 / follow the link</span></div>
    <div class="workflow-row">Verify <span>03 / check the result</span></div></div>
    <p class="visual-foot">One clear target. Visible checkpoints.</p>
  </div></div>
  <div class="facts"><div><p class="fact-number">12 sections</p><p class="fact-label">Ordered markers for coverage checks</p></div>
  <div><p class="fact-number">100% synthetic</p><p class="fact-label">Fictional text and decorative diagrams</p></div>
  <div><p class="fact-number">Loopback only</p><p class="fact-label">Served from this computer</p></div></div>
  <p class="note">This fixture has no accounts, forms, external resources, or provider requests. Decorative graphics are illustrative; they do not represent benchmark results.</p>
</main>`);

const chapters = [
  ['A clear starting point', 'A good browser task begins with a visible target. This page provides predictable content so you can focus on the workflow.', 'Find the first checkpoint near the top of the document.', '#eef1dd', '#728444'],
  ['Observe the current state', 'Read what is on screen before taking the next step. Each section carries its own label, number, and color.', 'The page remains deterministic across reloads.', '#e5f0eb', '#38765d'],
  ['Keep the scope small', 'A single navigation followed by a complete capture makes a useful first task. There are no account or form steps to configure.', 'The only navigation in this fixture stays on the local server.', '#e5edf4', '#417b99'],
  ['Make progress visible', 'Checkpoints turn a long document into an ordered sequence. A captured image should show the sections in the same order.', 'Use the visible numbers to inspect the stitched result.', '#f2e8da', '#ac7b43'],
  ['Pause for a fresh look', 'When the interface changes, observe again. New page content can be verified before the next action is selected.', 'This section is a visual checkpoint in the middle of the page.', '#eee7f2', '#8a669c'],
  ['Follow the document', 'A long-page capture advances through the document. These colored panels make missing or repeated regions easier to spot.', 'Decorative bars vary by section and carry no measured data.', '#e1efec', '#3a827d'],
  ['Continue with context', 'The lower half of a page matters too. Keep the section sequence intact from the first visible region to the final footer.', 'At this checkpoint the capture has passed the halfway point.', '#f3ecce', '#aa8933'],
  ['Check the boundaries', 'Look at the edges between panels. Consistent headings and spacing provide simple visual clues when inspecting a capture.', 'The fixture uses a normal scrolling document without fixed overlays.', '#e6ece0', '#66814b'],
  ['Keep data fictional', 'Every word and drawing here was created for this demonstration. There are no personal profiles or live service responses.', 'You can share a capture of this fixture without including account data.', '#efe4df', '#a87058'],
  ['Review the result', 'The final image should be readable and continuous. Match the section labels in the artifact to the labels in the page.', 'Successful capture is checked from the output, not from a progress message.', '#e4eaf2', '#557fa7'],
  ['Approach the final section', 'A near-complete capture still needs its last checkpoint. Continue through the remaining content and reach the footer.', 'This is the penultimate numbered panel.', '#ebe4ef', '#876a99'],
  ['Finish with evidence', 'The final numbered section is followed by an explicit ending marker. Both should appear in the saved image.', 'Check the footer below before declaring full coverage.', '#e5eddb', '#658344'],
];

const long = page(`${masthead(true)}<main>
<div class="wrap long-hero"><p class="eyebrow">The long-page fixture</p><h1>Twelve checkpoints.<br>One complete capture.</h1>
<p class="intro">A synthetic document for trying browser navigation and long-page capture. Follow the numbered sections and verify the final footer.</p>
<div class="legend"><span class="pill">Local plan mode</span><span class="pill">No API key</span><span class="pill">Fictional content</span><span class="pill">12 ordered sections</span></div></div>
${chapters.map(([heading, copy, detail, tint, accent], index) => {
  const number = String(index + 1).padStart(2, '0');
  return `<section class="chapter" aria-labelledby="section-${index + 1}" style="--tint:${tint};--accent:${accent}">
  <div class="wrap chapter-grid"><div class="chapter-index" aria-hidden="true">${number}</div><div>
  <p class="marker">LONG_${number}</p><h2 id="section-${index + 1}">${heading}</h2><p class="chapter-copy">${copy}</p><p class="chapter-detail">${detail}</p></div>
  <div class="diagram" aria-label="Decorative checkpoint ${number} illustration"><p class="diagram-label">CHECKPOINT ${number} / ILLUSTRATION</p>
  <div class="bars" aria-hidden="true">${Array.from({length:5}, (_, column) => `<span class="bar" style="--height:${35 + ((index * 17 + column * 23) % 72)}%;--opacity:${.35 + column * .15}"></span>`).join('')}</div>
  <p class="diagram-caption">Synthetic pattern · No benchmark data</p></div></div></section>`;
}).join('\n')}
<footer class="finish"><div class="wrap"><p class="marker">END_OF_LONG_PAGE</p><h2>You have reached the end.</h2>
<p>A complete capture includes all twelve checkpoints and this footer. Inspect the saved image to confirm the first section, the final section, and this ending marker.</p>
<p class="footer-meta">REINFORCED COMPUTER USE · SYNTHETIC LOCAL FIXTURE</p></div></footer></main>`);

function validatePort(port) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError('Demo port must be an integer from 0 to 65535.');
  }
}

/** Start an isolated fixture. Port 0 selects an available port for callers and tests. */
export async function startDemoServer({port = 0} = {}) {
  validatePort(port);
  const server = http.createServer((request, response) => {
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, {...headers, Allow: 'GET, HEAD'});
      response.end('Method not allowed.');
      return;
    }
    const pathname = new URL(request.url, `http://${HOST}`).pathname;
    if (pathname === '/favicon.ico') {
      response.writeHead(204, {'Cache-Control': 'no-store'});
      response.end();
      return;
    }
    const content = pathname === '/' ? home : pathname === '/long' ? long : undefined;
    response.writeHead(content === undefined ? 404 : 200, headers);
    response.end(request.method === 'HEAD' ? undefined : content ?? 'Page not found.');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  let closing;
  return {
    server,
    url: `http://${HOST}:${address.port}`,
    close() {
      closing ??= new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
      return closing;
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !/^--port=\d+$/.test(args[0]))) {
    throw new Error('Usage: node scripts/demo-site.mjs [--port=0..65535]');
  }
  const port = args.length ? Number(args[0].slice('--port='.length)) : 4318;
  const demo = await startDemoServer({port});
  console.log(`Reinforced Computer Use demo: ${demo.url}`);
  console.log('Synthetic local fixture. No API key needed. Press Ctrl+C to stop.');
  const stop = () => { void demo.close().catch(error => { console.error(error.message); process.exitCode = 1; }); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
