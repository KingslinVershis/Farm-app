import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export interface WeatherMcpCallResponse {
  success: boolean;
  tool: string;
  location: string;
  text?: string;
  raw?: any;
  error?: string;
  durationMs?: number;
}

// Helper to call @dangahagan/weather-mcp via stdio JSON-RPC
function invokeWeatherMcpTool(
  toolName: string,
  args: Record<string, any>,
  timeoutMs = 25000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn('npx', ['-y', '@dangahagan/weather-mcp@latest'], {
      env: {
        ...process.env,
        ENABLED_TOOLS: 'all',
        WEATHER_UNITS: 'metric',
      },
      shell: true,
    });

    let buffer = '';
    let isInitialized = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        child.kill();
      } catch {}
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Weather MCP timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1) {
            // Handshake 1: respond to initialize -> send initialized notification
            isInitialized = true;
            child.stdin.write(
              JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'
            );
            // Handshake 2: issue tools/call
            child.stdin.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                  name: toolName,
                  arguments: args,
                },
              }) + '\n'
            );
          } else if (msg.id === 2) {
            cleanup();
            resolve({ result: msg.result, durationMs: Date.now() - start });
            return;
          }
        } catch (e) {
          // ignore partial json
        }
      }
    });

    child.on('error', (err) => {
      cleanup();
      reject(err);
    });

    child.on('exit', (code) => {
      if (!isInitialized) {
        cleanup();
        reject(new Error(`Weather MCP process exited prematurely with code ${code}`));
      }
    });

    // Send initialize request after launch
    setTimeout(() => {
      try {
        child.stdin.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'farm-weather-mcp-client', version: '1.0' },
            },
          }) + '\n'
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    }, 800);
  });
}

export async function POST(req: NextRequest) {
  const authUser = await getServerAuthenticatedUser(req);
  if (!authUser?.id) {
    const res = NextResponse.json(
      { success: false, error: 'Session invalidated or expired', code: 'SESSION_INVALIDATED' },
      { status: 401 }
    );
    clearAuthCookies(res);
    return res;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tool = String(body.tool || 'get_weather_summary');
    const location = String(body.location || 'Chennai, Tamil Nadu');
    const units = body.units || 'metric';

    const args: Record<string, any> = {
      ...(tool !== 'check_service_status' ? { city_name: location } : {}),
      units,
      ...(body.params || {}),
      ...(body.extraArgs || {}),
    };

    const { result, durationMs } = await invokeWeatherMcpTool(tool, args);
    const content = result?.content || [];
    const text = content.map((c: any) => c.text || '').join('\n\n');

    return NextResponse.json<WeatherMcpCallResponse>({
      success: true,
      tool,
      location,
      text,
      raw: result,
      durationMs,
    });
  } catch (err: any) {
    console.error('[API /api/weather-mcp] error:', err);
    return NextResponse.json<WeatherMcpCallResponse>(
      {
        success: false,
        tool: 'unknown',
        location: '',
        error: err?.message || 'Failed to execute Weather MCP tool.',
      },
      { status: 500 }
    );
  }
}

