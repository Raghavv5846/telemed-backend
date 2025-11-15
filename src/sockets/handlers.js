const { getOnlineDoctorIds, sendToClient, sendToUser, broadcastGlobalDoctorAvailability } = require('./clients');
const { getRoom, broadcastToRoom, sendToPeer } = require('./rooms');
const { addIncomingCall, removeIncomingCall, getIncomingCall } = require('./calls');

async function handleMessage(ws, msg, peerId) {
  const { type, roomId, payload, to } = msg;
  if (!type) return sendToClient(ws, { type: 'error', message: 'missing_type' });

  switch (type) {
    case 'get-availability':
      return sendToClient(ws, { type: 'availability-list', doctorIds: getOnlineDoctorIds() });

    case 'doctor-availability': {
      const doctorId = msg.doctorId || payload?.doctorId;
      const isAvailable = msg.isAvailable || payload?.isAvailable;
      if (!doctorId) return sendToClient(ws, { type:'error', message: 'missing_doctorId' });
      return broadcastGlobalDoctorAvailability(doctorId, isAvailable);
    }

    case 'call-start': {
      const doctorId = msg.doctorId || payload?.doctorId;
      const callId = msg.callId || payload?.callId;
      const callerId = ws.userId;
      const meta = payload?.meta || {};
      if (!doctorId || !callId || !callerId) return sendToClient(ws, { type: 'error', message: 'missing_call_params' });

      const added = addIncomingCall(callId, callerId, doctorId, 30000, (info) => {
        sendToUser(info.callerId, { type: 'call-not-answered', callId, doctorId: info.doctorId });
        sendToUser(info.doctorId, { type: 'call-expired', callId });
      });

      if (!added) return sendToClient(ws, { type: 'error', message: 'call_already_active' });

      // notify doctor
      sendToUser(doctorId, { type: 'incoming-call', callId, from: callerId, doctorId, meta });
      return sendToClient(ws, { type: 'call-started-ack', callId });
    }

    case 'chat-message': {
        
        const message = msg.message;
        const reciverId = msg.receiverId;
        const senderId = msg.senderId;

        sendToUser(reciverId, { type: 'chat-message', message, senderId })
    }   
    case 'call-accepted': {
      const callId = msg.callId || payload?.callId;
      const info = getIncomingCall(callId);
      if (!info) return sendToClient(ws, { type: 'error', message: 'unknown_call' });
      removeIncomingCall(callId);
      sendToUser(info.callerId, { type: 'call-accepted', callId, doctorId: ws.userId });
      broadcastGlobalDoctorAvailability(ws.userId, false);
      return sendToClient(ws, { type: 'call-accepted-ack', callId });
    }

    case 'call-declined': {
      const callId = msg.callId || payload?.callId;
      const info = getIncomingCall(callId);
      if (info) {
        removeIncomingCall(callId);
        sendToUser(info.callerId, { type: 'call-declined', callId, doctorId: ws.userId });
      }
      return sendToClient(ws, { type: 'call-declined-ack', callId });
    }

    case 'join': {
      if (!roomId) return sendToClient(ws, { type:'error', message: 'missing_roomId' });
      const room = getRoom(roomId);
      const actualPeerId = peerId || ws.peerId || ws.userId;
      room.set(actualPeerId, ws);
      ws.peerId = actualPeerId;
      ws.roomId = roomId;
      broadcastToRoom(roomId, { type: 'peer-joined', roomId, from: actualPeerId }, actualPeerId);
      return sendToClient(ws, { type:'joined', roomId, peerId: actualPeerId });
    }

    case 'leave': {
      if (!roomId) return;
      return leaveRoom(peerId, roomId);
    }

    case 'offer':
    case 'answer':
    case 'ice-candidate':
    case 'control': {
      if (!roomId) return sendToClient(ws, { type:'error', message: 'missing_roomId' });
      if (to) return sendToPeer(roomId, to, { ...msg, from: peerId });
      return broadcastToRoom(roomId, { ...msg, from: peerId }, peerId);
    }

    default:
      return sendToClient(ws, { type:'error', message: 'unknown_type' });
  }
}

module.exports = { handleMessage };