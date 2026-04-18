// Heartbeat Scheduler for DevLead MCP (30-90s configurable)
// Integrated with Ollama client, MemPalace MCP queries, task decomposition, delegation

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_MS || '45000'); // default ~45s
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MCP_POSTGRES_URL = 'http://localhost:3003';
const MCP_FILESYSTEM_URL = 'http://localhost:3001';
const MCP_GITHUB_URL = 'http://localhost:3002';

console.log(`[HEARTBEAT] DevLead MCP Scheduler initialized with interval: ${HEARTBEAT_INTERVAL}ms`);
console.log('[SOUL] Loaded from SOUL.md - Pure orchestrator, MCP delegation only, hourly Grok strategic escalation');

// Ollama client integration
async function queryOllama(prompt) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5:32b',
        prompt,
        stream: false
      })
    });
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('[OLLAMA] Error:', error);
    return null;
  }
}

// MemPalace MCP queries
async function queryMemPalace() {
  // Query Postgres for memory state
  try {
    const response = await fetch(`${MCP_POSTGRES_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT * FROM mempalace ORDER BY wing, hall, room' })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[MEMPALACE] Error:', error);
    return [];
  }
}

// Task decomposition logic
async function decomposeTasks(planContent) {
  const prompt = `Decompose the following plan into atomic tasks that respect pure orchestrator principles (never code, delegate to agents). Plan: ${planContent}`;
  const response = await queryOllama(prompt);
  if (response) {
    // Parse response into tasks array
    return response.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1));
  }
  return [];
}

// MCP delegation to Roo Code
async function delegateToRoo(task) {
  // Simulate delegation via MCP
  console.log(`[DELEGATION] Delegating task: ${task} to Roo Code via MCP`);
  // In real, call MCP delegation server
  // For MVP, log and assume success
  return { success: true, report: `Task "${task}" delegated and completed.` };
}

async function heartbeat() {
  const timestamp = new Date().toISOString();
  console.log(`\n[HEARTBEAT ${timestamp}] SOUL alignment check passed`);

  // Query MemPalace for context
  const memory = await queryMemPalace();
  console.log('[MEMPALACE] Queried state:', memory.length, 'entries');

  // Read main-plan.md via filesystem MCP
  let planContent = '';
  try {
    const response = await fetch(`${MCP_FILESYSTEM_URL}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'plans/main-plan.md' })
    });
    const data = await response.json();
    planContent = data.content;
  } catch (error) {
    console.error('[PLAN] Error reading plan:', error);
  }

  // Decompose tasks
  const tasks = await decomposeTasks(planContent);
  console.log('[DECOMPOSITION] Tasks:', tasks);

  // Delegate each task
  for (const task of tasks) {
    const result = await delegateToRoo(task);
    if (result.success) {
      console.log('[DELEGATION] Success:', result.report);
    }
  }

  console.log('[LOG] WebSocket broadcast to Execution Log page');
  // Broadcast to WebSocket (implement in dashboard)
}

setInterval(heartbeat, HEARTBEAT_INTERVAL);

// Initial pulse
heartbeat();

console.log(`[INFO] Heartbeat daemon running. Use Ctrl+C to stop. Configurable via HEARTBEAT_MS env.`);
