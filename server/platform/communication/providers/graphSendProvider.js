/**
 * Microsoft Graph outbound send — stub until R5.
 */

async function sendRawMessage() {
  return {
    success: false,
    provider: 'microsoft-graph',
    error: 'Microsoft Graph send is not implemented yet (R5).',
    code: 'GRAPH_SEND_NOT_IMPLEMENTED'
  };
}

module.exports = {
  sendRawMessage
};
