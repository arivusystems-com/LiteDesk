/* eslint-disable no-console */
const DEFAULT_BASE_URL = process.env.HELPDESK_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.HELPDESK_AUTH_TOKEN || '';

function requiredEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}

async function requestJson(path) {
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { response, json };
}

async function runCheck(name, path) {
  const { response, json } = await requestJson(path);
  if (!response.ok || !json?.success) {
    const reason = json?.message || `HTTP ${response.status}`;
    throw new Error(`${name} failed: ${reason}`);
  }
  console.log(`PASS ${name}`);
}

async function main() {
  try {
    requiredEnv('HELPDESK_AUTH_TOKEN', AUTH_TOKEN);

    await runCheck('case_list', '/api/helpdesk/cases?limit=5');
    await runCheck('analytics_summary', '/api/helpdesk/cases/analytics/summary');
    await runCheck('analytics_trends', '/api/helpdesk/cases/analytics/trends');
    await runCheck('analytics_owners', '/api/helpdesk/cases/analytics/owners');
    await runCheck('analytics_distribution', '/api/helpdesk/cases/analytics/distribution');
    await runCheck('execution_settings', '/api/settings/applications/helpdesk/execution-settings');
    await runCheck('assignment_rules', '/api/settings/automation/assignment-rules?appKey=HELPDESK&moduleKey=cases');

    console.log('Helpdesk smoke checks passed.');
  } catch (error) {
    console.error('Helpdesk smoke checks failed:', error.message);
    process.exitCode = 1;
  }
}

main();
