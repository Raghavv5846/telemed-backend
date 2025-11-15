const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const logger = require('../utils/logger');
const { registerClient, unregisterClientByWs, getOnlineDoctorIds, sendToClient, sendToUser, broadcastGlobalDoctorAvailability } = require('./clients');

const { handleDisconnect } = require('./rooms');

const config = require('../config');
const { Doctor } = require('../repositories/doctor.repository');
const { handleMessage } = require('./handlers');

function createWSServer(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async function connection(ws, req) {
    const params = new URLSearchParams(req.url.replace('/ws?', ''));
    const token = params.get('token') || null;
    let userId = null;
    let role = 'user';
    let name;
    try {
      const payload = token ? jwt.verify(token, config.jwtSecret) : null;
      userId = payload?.id || null;
      role = payload?.role || 'PATIENT';
      name = payload?.name;
    } catch (err) {
      logger.error('Invalid token', err);
      ws.close(4001, 'Invalid token');
      return;
    }

    if (!userId) { ws.close(4001, 'Invalid token payload'); return; }

    const peerId = userId;
    registerClient(userId, ws, role, name);

    sendToClient(ws, { type: 'availability-list', doctorIds: getOnlineDoctorIds() });

    if (role === 'DOCTOR') {
      const doctor_availability = await Doctor.findById(userId);
      broadcastGlobalDoctorAvailability(userId, doctor_availability?.status || false);
    }

    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        handleMessage(ws, msg, peerId);
      } catch (err) {
        logger.error('Invalid message format', err);
        ws.send(JSON.stringify({ type: 'error', message: 'invalid_format' }));
      }
    });

    ws.on('close', () => {
      unregisterClientByWs(ws);
      handleDisconnect(peerId);
    });

    ws.on('error', err => logger.error('WS error', err));
  });

  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  return wss;
}

module.exports = { createWSServer };