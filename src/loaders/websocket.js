const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const rooms = new Map();
const clientsByUserId = new Map(); // userId -> { ws, role }

function registerClient(userId, ws, role = 'user') {
  clientsByUserId.set(userId, { ws, role });
  ws.userId = userId;
  ws.role = role;
}

function unregisterClientByWs(ws) {
    if (!ws) return;
    const uid = ws.userId;
    if (uid) {
      clientsByUserId.delete(uid);
      // if user was a doctor, announce offline
      if (ws.role === 'DOCTOR') {
        broadcastGlobalDoctorAvailability(uid, false, null);
      }
    }
    // also remove from rooms etc
    handleDisconnect(ws.peerId);
  }
  

function getOnlineDoctorIds() {
  const list = [];
  for (const [userId, info] of clientsByUserId.entries()) {
    if (info.role === 'DOCTOR') list.push(userId);
  }
  return list;
}

function sendToClient(ws, msg) {
  try { ws.send(JSON.stringify(msg)); } catch (e) { /* ignore */ }
}
function createWSServer(server, redis) {
    
    const wss = new WebSocket.Server({ server, path: '/ws' });
    
    
    wss.on('connection', function connection(ws, req) {
    const params = new URLSearchParams(req.url.replace('/ws?', ''));
    const token = params.get('token') || null;
        let userId = null;
        let role = 'user';
        try {
            const payload = token ? jwt.verify(token, config.jwtSecret) : null;
            userId = payload?.id || null;
            role = payload?.role || 'user';
        } catch (err) {
            logger.error('Invalid token', err);
            ws.close(4001, 'Invalid token');
            return;
        }

        // require authenticated user (change if you allow anonymous)
        if (!userId) {
            ws.close(4001, 'Invalid token payload');
            return;
        }

        // Use the userId as the default peerId for simpler consistent mapping.
        // If you want separate peerId for RTC rooms you can override later on 'join'.
        const peerId = userId;

        // store ids on the ws
        ws.userId = userId;
        ws.peerId = peerId;
        ws.role = role;

        registerClient(userId, ws, role);

        // send current availability snapshot
        sendToClient(ws, { type: 'availability-list', doctorIds: getOnlineDoctorIds() });

        // immediately broadcast doctor available if doc
        if (role === 'DOCTOR') {
            broadcastGlobalDoctorAvailability(userId, true);
        }
    // } catch (err) {
    //     console.log(err);
        
    //   ws.close(4001, 'Invalid token');
    //   return;
    // }

    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        handleMessage(ws, msg, peerId, redis);
      } catch (err) {
        logger.error('Invalid message format', err);
        ws.send(JSON.stringify({ type: 'error', message: 'invalid_format' }));
      }
    });

    ws.on('close', () => handleDisconnect(peerId));
    ws.on('error', err => logger.error('WS error', err));
  });

  // heartbeat
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

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}


// helper to broadcast doctor availability to everyone (and publish to redis)
function broadcastGlobalDoctorAvailability(doctorId, isAvailable, redis) {
    // send to all connected clients
    for (const [userId, info] of clientsByUserId.entries()) {
      try {
        info.ws.send(JSON.stringify({ type: 'doctor-availability', doctorId, isAvailable }));
      } catch (e) { /* ignore */ }
    }
    // publish to redis so other nodes can also notify
    if (redis) {
      redis.publish('global:doctor-availability', JSON.stringify({ doctorId, isAvailable }));
    }
  }

function handleMessage(ws, msg, peerId, redis) {
  const { type, roomId, payload, to } = msg;
  if (!type) {
    ws.send(JSON.stringify({ type: 'error', message: 'missing_type' }));
    return;
  }

  switch(type) {
    case 'get-availability': {
        // reply to the requesting client with snapshot
        ws.send(JSON.stringify({ type: 'availability-list', doctorIds: getOnlineDoctorIds() }));
        break;
      }
  
      case 'call-started': {
        // payload should contain doctorId (or you can use ws.userId)
        const doctorId = msg.doctorId || msg.payload?.doctorId || ws.userId;
        // mark doctor as unavailable to other users
        broadcastGlobalDoctorAvailability(doctorId, false, redis);
        // you may want to set some internal state for active calls:
        // e.g., activeCalls.set(callId, { doctorId, userId: msg.userId, startedAt: Date.now() })
        break;
      }
  
      case 'call-ended': {
        const doctorId = msg.doctorId || msg.payload?.doctorId || ws.userId;
        broadcastGlobalDoctorAvailability(doctorId, true, redis);
        break;
      }
  
      // existing cases: join/leave/offer/answer/ice-candidate/control...
      case 'join': {
        if (!roomId) return ws.send(JSON.stringify({ type:'error', message: 'missing_roomId'}));
        const room = getRoom(roomId);
        // use peerId from ws if not supplied
        const actualPeerId = peerId || ws.peerId || ws.userId;
        room.set(actualPeerId, ws);
        ws.peerId = actualPeerId;
        ws.roomId = roomId;
  
        // notify others peer-joined
        broadcastToRoom(roomId, { type: 'peer-joined', roomId, from: actualPeerId }, actualPeerId, redis);
        ws.send(JSON.stringify({ type:'joined', roomId, peerId: actualPeerId }));
        break;
      }

    case 'leave': {
      if (!roomId) return;
      leaveRoom(peerId, roomId, redis);
      break;
    }

    case 'offer':
    case 'answer':
    case 'ice-candidate':
    case 'control': {
      // forward to specific peer or broadcast in room
      if (!roomId) return ws.send(JSON.stringify({ type:'error', message: 'missing_roomId' }));
      if (to) {
        sendToPeer(roomId, to, { ...msg, from: peerId }, redis);
      } else {
        broadcastToRoom(roomId, { ...msg, from: peerId }, peerId, redis);
      }
      break;
    }

    default:
        if (['offer','answer','ice-candidate','control'].includes(type)) {
            if (!roomId) return ws.send(JSON.stringify({ type:'error', message: 'missing_roomId' }));
            if (to) {
              sendToPeer(roomId, to, { ...msg, from: peerId }, redis);
            } else {
              broadcastToRoom(roomId, { ...msg, from: peerId }, peerId, redis);
            }
            break;
          }
    
      ws.send(JSON.stringify({ type:'error', message: 'unknown_type' }));
  }
}

function sendToPeer(roomId, toPeerId, msg, redis) {
  const room = rooms.get(roomId);
  if (room && room.has(toPeerId)) {
    const target = room.get(toPeerId);
    try { target.send(JSON.stringify(msg)); } catch(e) { logger.error(e); }
  } else if (redis) {
    // publish to redis so other nodes can route
    redis.publish(`signals:${roomId}`, JSON.stringify({ to: toPeerId, msg }));
  }
}

function broadcastToRoom(roomId, msg, exceptPeerId, redis) {
  const room = rooms.get(roomId);
  if (room) {
    for (const [peerId, ws] of room.entries()) {
      if (peerId === exceptPeerId) continue;
      try { ws.send(JSON.stringify(msg)); } catch(e){ logger.error(e); }
    }
  }
  if (redis) {
    redis.publish(`signals:${roomId}`, JSON.stringify({ broadcast: true, except: exceptPeerId, msg }));
  }
}

function leaveRoom(peerId, roomId, redis) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  broadcastToRoom(roomId, { type: 'peer-left', roomId, from: peerId }, peerId, redis);
  if (room.size === 0) rooms.delete(roomId);
}


function handleDisconnect(peerId) {
    // remove from room(s)
    for (const [roomId, room] of rooms.entries()) {
      if (room.has(peerId)) {
        room.delete(peerId);
        broadcastToRoom(roomId, { type:'peer-left', roomId, from: peerId }, peerId, null);
        if (room.size === 0) rooms.delete(roomId);
      }
    }
  }

module.exports = { createWSServer };