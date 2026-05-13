import type { IncomingMessage, ServerResponse } from 'node:http';

export declare function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void;

export declare function serveConfigJs(
  response: ServerResponse,
  options: { configPath: string },
): Promise<void>;

export declare function handleWeatherGuidanceRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: { configPath: string },
): Promise<void>;
