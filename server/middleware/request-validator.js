export function validateChatPayload(req, res, next) {
  const { messages, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid payload: "messages" must be an array.' });
  }

  if (messages.length === 0) {
    return res.status(400).json({ error: 'Invalid payload: "messages" array cannot be empty.' });
  }

  // Check last message
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || !lastMsg.role || typeof lastMsg.content !== 'string') {
    return res.status(400).json({ error: 'Invalid message structure in payload.' });
  }

  // Prevent massive payloads exceeding 200KB of plain text
  const totalLength = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
  if (totalLength > 200000) {
    return res.status(413).json({ error: 'Payload too large. Message history exceeds allowable context size.' });
  }

  next();
}
