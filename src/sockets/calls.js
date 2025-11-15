const activeIncomingCalls = new Map();

function addIncomingCall(callId, callerId, doctorId, timeoutMs = 30000, onTimeout) {
  if (activeIncomingCalls.has(callId)) return false;
  const t = setTimeout(() => {
    const info = activeIncomingCalls.get(callId);
    if (!info) return;
    activeIncomingCalls.delete(callId);
    onTimeout && onTimeout(info);
  }, timeoutMs);
  activeIncomingCalls.set(callId, { callerId, doctorId, timeout: t });
  return true;
}

function removeIncomingCall(callId) {
  const info = activeIncomingCalls.get(callId);
  if (!info) return null;
  clearTimeout(info.timeout);
  activeIncomingCalls.delete(callId);
  return info;
}

function getIncomingCall(callId) {
  return activeIncomingCalls.get(callId);
}

module.exports = { addIncomingCall, removeIncomingCall, getIncomingCall };