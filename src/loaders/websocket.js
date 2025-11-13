const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const rooms = new Map();
const clientsByUserId = new Map();

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
  try { ws.send(JSON.stringify(msg)); } catch (e) { }
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

        if (!userId) {
            ws.close(4001, 'Invalid token payload');
            return;
        }

        const peerId = userId;

        ws.userId = userId;
        ws.peerId = peerId;
        ws.role = role;

        registerClient(userId, ws, role);

        sendToClient(ws, { type: 'availability-list', doctorIds: getOnlineDoctorIds() });

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
        console.log("rawww",raw);
        
        handleMessage(ws, msg, peerId, redis);
      } catch (err) {
        logger.error('Invalid message format', err);
        ws.send(JSON.stringify({ type: 'error', message: 'invalid_format' }));
      }
    });

    ws.on('close', () => handleDisconnect(peerId));
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

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}


const activeIncomingCalls = new Map();

function sendToUser(userId, msg, redis) {
  const info = clientsByUserId.get(userId);
  if (info && info.ws && info.ws.readyState === info.ws.OPEN) {
    try { info.ws.send(JSON.stringify(msg)); return true; } catch(e){ logger.error(e); return false; }
  }
  if (redis) {
    redis.publish(`incoming:${userId}`, JSON.stringify(msg));
  }
  return false;
}

function setupRedisIncomingSubscriber(redis) {
  if (!redis || !redis.subscribe) return;
  const sub = redis.duplicate ? redis.duplicate() : redis; 
  sub.subscribe && sub.subscribe('incoming:*'); 
  sub.on('message', (channel, message) => {
    try {
      const m = JSON.parse(message);
      const userId = channel.split(':')[1];
      sendToUser(userId, m, null); 
    } catch (e) { logger.error('Bad incoming redis msg', e); }
  });

}

function notifyIncomingCall({ callId, callerId, doctorId, meta }, redis) {
  const msg = {
    type: 'incoming-call',
    callId,
    from: callerId,
    doctorId,
    meta 
  };

  const sentLocally = sendToUser(doctorId, msg, redis);
  return sentLocally;
}
function broadcastGlobalDoctorAvailability(doctorId, isAvailable, redis) {
    for (const [userId, info] of clientsByUserId.entries()) {
      try {
        info.ws.send(JSON.stringify({ type: 'doctor-availability', doctorId, isAvailable }));
      } catch (e) { }
    }
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

  console.log("type",payload,type,roomId);
  
  switch(type) {
    case 'get-availability': {
        ws.send(JSON.stringify({ type: 'availability-list', doctorIds: getOnlineDoctorIds() }));
        break;
      }
  
      case 'call-start': {
        const doctorId = msg.doctorId || payload?.doctorId;
        const callId = msg.callId || payload?.callId;
        const callerId = ws.userId || msg.userId || payload?.userId;
        const meta = payload?.meta || {};
  
        if (!doctorId || !callId || !callerId) {
          return ws.send(JSON.stringify({ type: 'error', message: 'missing_call_params' }));
        }
  
        const timeoutMs = 30000; 
        if (activeIncomingCalls.has(callId)) {
          return ws.send(JSON.stringify({ type: 'error', message: 'call_already_active' }));
        }
  
        const t = setTimeout(() => {
          const info = activeIncomingCalls.get(callId);
          if (!info) return;
          sendToUser(info.callerId, { type: 'call-not-answered', callId, doctorId: info.doctorId }, redis);
          sendToUser(info.doctorId, { type: 'call-expired', callId }, redis);
          activeIncomingCalls.delete(callId);
        }, timeoutMs);
  
        activeIncomingCalls.set(callId, { callerId, doctorId, timeout: t });
  
        notifyIncomingCall({ callId, callerId, doctorId, meta }, redis);
  
        ws.send(JSON.stringify({ type: 'call-started-ack', callId }));
        break;
      }
  
      case 'call-accepted': {
        const callId = msg.callId || payload?.callId;
        const doctorId = ws.userId;
        const info = activeIncomingCalls.get(callId);
        if (!info) {
          return ws.send(JSON.stringify({ type: 'error', message: 'unknown_call' }));
        }
  
        clearTimeout(info.timeout);
        activeIncomingCalls.delete(callId);
  
        sendToUser(info.callerId, { type: 'call-accepted', callId, doctorId }, redis);
  
        broadcastGlobalDoctorAvailability(doctorId, false, redis);
  
        ws.send(JSON.stringify({ type: 'call-accepted-ack', callId }));
        break;
      }
  
      // Doctor declines the incoming call
      case 'call-declined': {
        const callId = msg.callId || payload?.callId;
        const doctorId = ws.userId;
        const info = activeIncomingCalls.get(callId);
        if (info) {
          clearTimeout(info.timeout);
          activeIncomingCalls.delete(callId);
          sendToUser(info.callerId, { type: 'call-declined', callId, doctorId }, redis);
        }
        ws.send(JSON.stringify({ type: 'call-declined-ack', callId }));
        break;
      }
      case 'call-started': {
        const doctorId = msg.doctorId || msg.payload?.doctorId || ws.userId;
        broadcastGlobalDoctorAvailability(doctorId, false, redis);
        break;
      }
  
      case 'call-ended': {
        const doctorId = msg.doctorId || msg.payload?.doctorId || ws.userId;
        broadcastGlobalDoctorAvailability(doctorId, true, redis);
        break;
      }
  
      case 'join': {
        if (!roomId) return ws.send(JSON.stringify({ type:'error', message: 'missing_roomId'}));
        const room = getRoom(roomId);
        const actualPeerId = peerId || ws.peerId || ws.userId;
        room.set(actualPeerId, ws);
        ws.peerId = actualPeerId;
        ws.roomId = roomId;
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