const logger = require("../utils/logger");

const clientsByUserId = new Map();

function registerClient(userId, ws, role = 'PATIENT', name) {
  clientsByUserId.set(userId, { ws, role, name });
  ws.userId = userId;
  ws.role = role;
  ws.name = name;
}

function broadcastGlobalDoctorAvailability(doctorId, isAvailable) {
    for (const [userId, info] of clientsByUserId.entries()) {
      try {
        info.ws.send(JSON.stringify({ type: 'doctor-availability', doctorId, isAvailable, info }));
      } catch (e) { }
    }
  }


function unregisterClient(userId) {
  const info = clientsByUserId.get(userId);
  if (!info) return;
  clientsByUserId.delete(userId);
}

function unregisterClientByWs(ws) {
  if (!ws) return;
  const uid = ws.userId;
  if (uid) {
    unregisterClient(uid);
  }
}

function getOnlineDoctorIds() {
  const list = [];
  for (const [userId, info] of clientsByUserId.entries()) {
    if (info.role === 'DOCTOR') list.push(userId);
  }
  return list;
}

function sendToClient(ws, msg) {
  try { ws.send(JSON.stringify(msg)); } catch (e) { logger.error("error while sending socket to cleint", e)
   }
}

function sendToUser(userId, msg) {
  const info = clientsByUserId.get(userId);
  if (info && info.ws && info.ws.readyState === info.ws.OPEN) {
    try { info.ws.send(JSON.stringify(msg)); return true; } catch (e) { return false; }
  }
  return false;
}

module.exports = {
  clientsByUserId,
  registerClient,
  unregisterClient,
  unregisterClientByWs,
  getOnlineDoctorIds,
  sendToClient,
  sendToUser,
  broadcastGlobalDoctorAvailability
};