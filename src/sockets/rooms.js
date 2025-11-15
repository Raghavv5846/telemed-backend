const logger = require("../utils/logger");

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function broadcastToRoom(roomId, msg, exceptPeerId) {
  const room = rooms.get(roomId);
  if (room) {
    for (const [peerId, ws] of room.entries()) {
      if (peerId === exceptPeerId) continue;
      try { ws.send(JSON.stringify(msg)); } catch (e) { logger.error("Error while broadcasting socket to room",e) }
    }
  }
}

function sendToPeer(roomId, toPeerId, msg) {
  const room = rooms.get(roomId);
  if (room && room.has(toPeerId)) {
    const ws = room.get(toPeerId);
    try { ws.send(JSON.stringify(msg)); } catch (e) { logger.error("Error when sending to peer",e) }
    return true;
  }
  return false;
}

function leaveRoom(peerId, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  broadcastToRoom(roomId, { type: 'peer-left', roomId, from: peerId }, peerId);
  if (room.size === 0) rooms.delete(roomId);
}

function handleDisconnect(peerId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.has(peerId)) {
      room.delete(peerId);
      broadcastToRoom(roomId, { type: 'peer-left', roomId, from: peerId }, peerId);
      if (room.size === 0) rooms.delete(roomId);
    }
  }
}

module.exports = { getRoom, rooms, broadcastToRoom, sendToPeer, leaveRoom, handleDisconnect };
