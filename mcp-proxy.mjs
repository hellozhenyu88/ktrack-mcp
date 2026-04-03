#!/usr/bin/env node
/**
 * MCP stdio-to-HTTP proxy
 * 
 * Claude Desktop / Cursor 通过 stdio 与此脚本通信，
 * 脚本将 JSON-RPC 请求转发到远程 MCP HTTP Server。
 * 
 * 所有请求按顺序处理，确保 initialize 完成后再发后续请求。
 */

const MCP_URL = process.env.MCP_URL || 'http://localhost:3200/mcp';
const API_KEY = process.env.MCP_API_KEY || '';

let sessionId = null;

// --- Sequential message queue ---
const messageQueue = [];
let processing = false;

function enqueue(raw) {
    messageQueue.push(raw);
    if (!processing) drainQueue();
}

async function drainQueue() {
    processing = true;
    while (messageQueue.length > 0) {
        const raw = messageQueue.shift();
        await processMessage(raw);
    }
    processing = false;
}

// --- I/O setup ---
process.stdin.setEncoding('utf-8');
process.stdin.resume();

let buffer = '';
let stdinOpen = true;

process.stdin.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) enqueue(trimmed);
    }
});

process.stdin.on('end', () => {
    stdinOpen = false;
});

// Keep process alive while stdin is open or queue is processing
setInterval(() => {
    if (!stdinOpen && !processing && messageQueue.length === 0) {
        process.exit(0);
    }
}, 200);

// --- Helpers ---
function writeResponse(data) {
    process.stdout.write(JSON.stringify(data) + '\n');
}

function log(msg) {
    process.stderr.write(`[mcp-proxy] ${msg}\n`);
}

// --- Core message handler ---
async function processMessage(raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    } catch {
        log(`Invalid JSON: ${raw}`);
        return;
    }

    const isNotification = msg.id === undefined || msg.id === null;
    const requestId = msg.id;

    try {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': `Bearer ${API_KEY}`,
        };
        if (sessionId) {
            headers['Mcp-Session-Id'] = sessionId;
        }

        log(`>> ${msg.method} (id:${requestId ?? 'notification'})`);

        const resp = await fetch(MCP_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(msg),
        });

        // Capture session id
        const newSession = resp.headers.get('mcp-session-id');
        if (newSession) {
            sessionId = newSession;
            log(`Session: ${sessionId}`);
        }

        // Handle HTTP errors
        if (!resp.ok) {
            const body = await resp.text();
            log(`HTTP ${resp.status}: ${body.substring(0, 300)}`);

            // Session expired (404) — re-initialize and retry
            if (resp.status === 404 && sessionId) {
                log('Session expired, re-initializing...');
                sessionId = null;

                // Re-initialize
                const initResp = await fetch(MCP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Authorization': `Bearer ${API_KEY}` },
                    body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'mcp-proxy', version: '1.0' } }, id: '__reinit__' }),
                });
                const newSess = initResp.headers.get('mcp-session-id');
                if (newSess) {
                    sessionId = newSess;
                    log(`Re-initialized session: ${sessionId}`);
                    // Send notifications/initialized
                    await fetch(MCP_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Authorization': `Bearer ${API_KEY}`, 'Mcp-Session-Id': sessionId },
                        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
                    });
                    // Retry the original request
                    if (!isNotification) {
                        log(`Retrying ${msg.method} (id:${requestId})`);
                        const retryResp = await fetch(MCP_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Authorization': `Bearer ${API_KEY}`, 'Mcp-Session-Id': sessionId },
                            body: JSON.stringify(msg),
                        });
                        if (retryResp.ok) {
                            const retryBody = await retryResp.text();
                            try {
                                const parsed = JSON.parse(retryBody.trim());
                                if (parsed.id === null || parsed.id === undefined) parsed.id = requestId;
                                writeResponse(parsed);
                                log(`<< ${msg.method} OK after retry (id:${parsed.id})`);
                            } catch {
                                writeResponse({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: retryBody.trim() }] }, id: requestId });
                            }
                            return;
                        }
                    }
                }
            }

            if (!isNotification) {
                writeResponse({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: `HTTP ${resp.status}: ${resp.statusText}` },
                    id: requestId,
                });
            }
            return;
        }

        // Notifications — no response needed
        if (isNotification) {
            await resp.text(); // consume
            return;
        }

        const contentType = resp.headers.get('content-type') || '';
        const bodyText = await resp.text();

        if (contentType.includes('text/event-stream')) {
            // Parse SSE: extract JSON-RPC from "data:" lines
            const sseLines = bodyText.split('\n');
            let responseSent = false;

            for (const line of sseLines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (!data) continue;

                try {
                    const parsed = JSON.parse(data);

                    // Only forward valid JSON-RPC responses
                    if (parsed.jsonrpc === '2.0' && (parsed.result !== undefined || parsed.error !== undefined)) {
                        // Ensure id matches the request (fix null id from server)
                        if (parsed.id === null || parsed.id === undefined) {
                            parsed.id = requestId;
                        }
                        writeResponse(parsed);
                        responseSent = true;
                        log(`<< ${msg.method} OK (id:${parsed.id})`);
                    }
                } catch (e) {
                    log(`SSE parse error: ${e.message}`);
                }
            }

            if (!responseSent) {
                log(`No valid response in SSE for ${msg.method} (id:${requestId})`);
                writeResponse({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'No valid response from server' },
                    id: requestId,
                });
            }
        } else {
            // Plain JSON response
            try {
                const parsed = JSON.parse(bodyText.trim());
                if (parsed.id === null || parsed.id === undefined) {
                    parsed.id = requestId;
                }
                writeResponse(parsed);
                log(`<< ${msg.method} OK (id:${parsed.id})`);
            } catch {
                writeResponse({
                    jsonrpc: '2.0',
                    result: { content: [{ type: 'text', text: bodyText.trim() }] },
                    id: requestId,
                });
            }
        }
    } catch (err) {
        log(`Error for ${msg.method}: ${err.message}`);
        if (!isNotification) {
            writeResponse({
                jsonrpc: '2.0',
                error: { code: -32603, message: `Proxy error: ${err.message}` },
                id: requestId,
            });
        }
    }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
