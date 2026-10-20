const baseUrl = 'http://127.0.0.1:3001';

const requests = [
  ['GET /api/tickets', '/api/tickets'],
  ['GET /api/tickets/1', '/api/tickets/1'],
  ['GET /api/tickets/999404', '/api/tickets/999404'],
  ['GET /api/tickets/abc', '/api/tickets/abc'],
  ['GET /api/tickets/0400', '/api/tickets/0400'],
  ['GET /api/unknown', '/api/unknown']
];

async function run() {
  for (const [label, path] of requests) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      console.log(`${label} -> ${response.status}`);
      console.log(JSON.stringify(body));
    } catch (error) {
        console.error(`${label} -> request failed: ${error.message}`);
    }
  }
}

run();
