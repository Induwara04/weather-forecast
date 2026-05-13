import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

export const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
};

const readRequestBody = async (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 16 * 1024) {
        reject(new Error('Request body too large.'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    request.on('error', (error) => {
      reject(error);
    });
  });

const extractOpenAiText = (payload) => {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return '';
  }

  return payload.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n');
};

const parseModelJson = (text) => {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(normalized);
};

const loadConfig = async (configPath) => {
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const file = await readFile(configPath, 'utf8');
    const sandbox = { window: { configs: {} } };

    vm.runInNewContext(file, sandbox, { timeout: 1000 });

    return sandbox.window?.configs ?? {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to read config.js.';
    throw new Error(`Invalid config.js: ${message}`);
  }
};

const getRuntimeConfig = async (configPath) => {
  const uploadedConfig = await loadConfig(configPath);

  return {
    openAiApiKey:
      uploadedConfig.OPENAI_API_KEY ||
      uploadedConfig.openAiApiKey ||
      process.env.OPENAI_API_KEY ||
      '',
    openAiModel:
      uploadedConfig.OPENAI_MODEL ||
      uploadedConfig.openAiModel ||
      process.env.OPENAI_MODEL ||
      'gpt-5.4-mini',
  };
};

export const serveConfigJs = async (response, { configPath }) => {
  try {
    const body = existsSync(configPath)
      ? await readFile(configPath, 'utf8')
      : 'window.configs = {};';

    response.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
    });
    response.end(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to read config.js.';
    sendJson(response, 500, { error: message });
  }
};

export const handleWeatherGuidanceRequest = async (
  request,
  response,
  { configPath },
) => {
  let runtimeConfig;

  try {
    runtimeConfig = await getRuntimeConfig(configPath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load runtime config.';
    sendJson(response, 500, { error: message });
    return;
  }

  if (!runtimeConfig.openAiApiKey) {
    sendJson(response, 500, {
      error:
        'OpenAI API key is not configured. Upload ./config.js with OPENAI_API_KEY.',
    });
    return;
  }

  let payload;

  try {
    const body = await readRequestBody(request);
    payload = JSON.parse(body);
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  const home = payload?.home;
  const topArea = payload?.topArea;
  const next24Hours = Array.isArray(payload?.next24Hours) ? payload.next24Hours : [];

  if (!home || !home.current || !home.currentAir || !Array.isArray(home.hourly)) {
    sendJson(response, 400, { error: 'Home weather details are required.' });
    return;
  }

  if (!next24Hours.length) {
    sendJson(response, 400, { error: 'Next 24 hour forecast points are required.' });
    return;
  }

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runtimeConfig.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: runtimeConfig.openAiModel,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'You are a careful weather advisor. You return only valid JSON. Based on the supplied home weather details and next-24-hour forecast, produce exactly 3 practical suggestions for the next 24 hours. Keep advice specific, concise, and action-oriented.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Return JSON with exactly these keys: summary, suggestions.
summary must be a short string.
suggestions must be an array of exactly 3 objects, each with exactly these keys: title, detail.

Home weather details:
${JSON.stringify({
  location: home.location,
  current: home.current,
  currentAir: home.currentAir,
  next24Hours,
  today: home.daily?.[0] ?? null,
  topArea,
})}`,
              },
            ],
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      sendJson(response, 502, {
        error: `OpenAI request failed with ${openAiResponse.status}.`,
        detail: errorText.slice(0, 400),
      });
      return;
    }

    const openAiPayload = await openAiResponse.json();
    const text = extractOpenAiText(openAiPayload);

    if (!text.trim()) {
      sendJson(response, 502, {
        error: 'OpenAI returned no output text for weather guidance.',
      });
      return;
    }

    const result = parseModelJson(text);
    const suggestions = Array.isArray(result.suggestions)
      ? result.suggestions.slice(0, 3)
      : [];

    if (suggestions.length !== 3) {
      throw new Error('AI did not return exactly 3 suggestions.');
    }

    sendJson(response, 200, {
      summary: String(result.summary ?? ''),
      suggestions: suggestions.map((item) => ({
        title: String(item?.title ?? 'Guidance'),
        detail: String(item?.detail ?? ''),
      })),
      model: runtimeConfig.openAiModel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Weather guidance failed unexpectedly.';
    sendJson(response, 500, { error: message });
  }
};
