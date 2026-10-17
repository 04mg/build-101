import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { CLAUDE_MODEL } from './cruce/claude.js';

const config = loadConfig();
const { server, abortRuns } = createApp(config);
server.listen(config.port, config.host, () => {
  console.log(`Agent service: http://${config.host}:${config.port}`);
  console.log(`TrailBase upstream: ${config.trailbaseUrl}`);
  console.log(config.ai ? `Agent: claude -p · ${CLAUDE_MODEL}${config.exaApiKey ? ' · Exa' : ''}` : 'Agent disabled: install and log in to Claude Code (`claude`).');
});

function shutdown() {
  abortRuns();
  server.close(() => process.exit(0));
  setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 5000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
