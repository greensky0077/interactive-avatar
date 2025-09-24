const fs = require('fs');
const path = require('path');

const project = { id: 'prj_kqQpTttaDZ9eGdAEwyK8iXnLKL7q', teamId: 'team_516wJORHdpIFReadtWC828Gf' };
const token = process.env.VERCEL_TOKEN;

if (!token) {
  console.error('Missing VERCEL_TOKEN');
  process.exit(1);
}

async function main() {
  const body = { gitRepository: { type: 'github', repo: 'greensky0077/interactive-avatar' } };
  const res = await fetch(https://api.vercel.com/v10/projects/?teamId=, {
    method: 'PATCH',
    headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('Failed:', res.status, text);
    process.exit(1);
  }
  console.log(text);
}

main().catch(err => { console.error(err); process.exit(1); });
