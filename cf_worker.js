const hostlist = ['api.dandanplay.net'];
const allowed_methods = 'GET'
const allowed_hearders = 'Content-Type'
const max_age = '86400'

async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return handleOptionsRequest()
  } else if (request.method === 'GET') {
    return handleGetRequest(request, env)
  } else {
    return Forbidden(`Method ${request.method}`)
  }
}

async function handleOptionsRequest() {
  return new Response(null, {
    status: 204,
    statusText: 'No Context',
    headers: new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowed_methods,
      'Access-Control-Allow-Headers': allowed_hearders,
      'Access-Control-Max-Age': max_age
    })
  })
}

async function handleGetRequest(request, env) {
  const urlObj = new URL(request.url);
  let url = urlObj.href.replace(urlObj.origin + '/', '').trim();
  let tUrlObj
  try {
    tUrlObj = new URL(url);
  }
  catch {
    return Forbidden(url)
  }
  if (!hostlist.includes(tUrlObj.hostname)) {
    return Forbidden(tUrlObj);
  }
  let response = await fetch(url, {
    headers: new Headers({
      ...request.headers,
      'X-Auth': '1',
      'X-AppId': env.APPID,
      'X-AppSecret': env.APPSECRET,
    }),
    body: request.body,
    method: request.method,
  });
  response = new Response(response.body, response);
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}

function Forbidden(str) {
  return new Response(`${str} Not Allowed.`, {
    status: 403,
  });
}

export default {
  async fetch(request, env, _) {
    return handleRequest(request, env);
  }
};
