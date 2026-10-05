import {createServer} from 'node:http';

const html = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Reinforced CU acceptance</title><style>body{font:18px/1.5 system-ui;margin:32px}section{min-height:620px;border-bottom:1px solid #ccc;padding:24px}iframe{width:90%;height:280px;border:2px solid #456}button,input{font:inherit;margin:8px}</style></head><body>${body}</body></html>`;

function serve(body, type = 'text/html; charset=utf-8', status = 200) {
  return (response) => { response.writeHead(status, {'content-type': type, 'cache-control': 'no-store'}); response.end(body); };
}

const frameServer = createServer((request, response) => {
  if (request.url === '/frame') return serve(html('<h1>Cross-origin frame</h1><button id="reveal" onclick="parent.postMessage({kind:\'frame-result\',value:\'FRAME_OK\'},\'*\')">Reveal frame result</button><p>Frame marker: INNER_FRAME</p>'))(response);
  return serve('Not found', 'text/plain', 404)(response);
});

await new Promise(resolve => frameServer.listen(0, '127.0.0.1', resolve));
const framePort = frameServer.address().port;
const frameUrl = `http://127.0.0.1:${framePort}/frame`;

const mainServer = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/') return serve(html(`<h1>Acceptance fixture</h1><nav><a href="/long">Long page</a> <a href="/transfer">Transfer</a> <a href="/login">Login</a> <a href="/captcha">Captcha</a></nav><iframe title="Cross-origin acceptance frame" src="${frameUrl}"></iframe><p id="frame-result">Frame result: pending</p><script>addEventListener('message', event => { if(event.origin === 'http://127.0.0.1:${framePort}' && event.data?.kind === 'frame-result') document.getElementById('frame-result').textContent = 'Frame result: ' + event.data.value; });</script>`))(response);
  if (path === '/long') return serve(html(`<h1>Long-page acceptance</h1>${Array.from({length: 12}, (_, i) => `<section><h2>Section ${i + 1}</h2><p>Marker LONG_${String(i + 1).padStart(2, '0')}</p></section>`).join('')}<footer id="bottom">END_OF_LONG_PAGE</footer>`))(response);
  if (path === '/transfer') return serve(html('<h1>Transfer acceptance</h1><a href="/download" download="fixture.txt">Download fixture</a><form action="/upload" method="post" enctype="multipart/form-data"><label for="file">Choose fixture file</label><input id="file" type="file" name="file"><button type="submit">Upload fixture</button></form>'))(response);
  if (path === '/download') return serve('REINFORCED_DOWNLOAD_OK\n', 'text/plain; charset=utf-8')(response);
  if (path === '/upload' && request.method === 'POST') {
    const chunks = [];
    request.on('data', chunk => { chunks.push(chunk); });
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      const markerFound = body.includes(Buffer.from('REINFORCED_UPLOAD_OK'));
      serve(html(`<h1>Upload ${markerFound ? 'received' : 'rejected'}</h1><p id="upload-bytes">Bytes: ${body.length}</p><p id="upload-marker">Marker: ${markerFound ? 'MATCH' : 'MISSING'}</p>`))(response);
    });
    return;
  }
  if (path === '/login') return serve(html('<h1>Local login acceptance</h1><form action="/session" method="post"><label>Username <input name="username" autocomplete="off"></label><label>Password <input type="password" name="password" autocomplete="off"></label><button type="submit">Log in</button></form>'))(response);
  if (path === '/session' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => serve(html(body === 'username=fixture-user&password=fixture-pass' ? '<h1>Local login accepted</h1>' : '<h1>Local login rejected</h1>'))(response));
    return;
  }
  if (path === '/captcha') return serve(html('<h1>Captcha handoff acceptance</h1><p>Challenge: enter the word HUMAN</p><label>Verification code <input name="captcha"></label><button>Verify captcha</button>'))(response);
  return serve('Not found', 'text/plain', 404)(response);
});

await new Promise(resolve => mainServer.listen(0, 'localhost', resolve));
console.log(JSON.stringify({mainUrl: `http://localhost:${mainServer.address().port}/`, frameUrl}));

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  mainServer.close(); frameServer.close();
});
