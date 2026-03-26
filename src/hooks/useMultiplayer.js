import { useState, useEffect, useRef, useCallback } from 'react';

export function useMultiplayer() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const handlersRef = useRef([]);

  const connect = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (wsRef.current?.readyState === 1) { resolve(); return; }
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => { setConnected(true); setError(null); resolve(); };
      ws.onerror = () => { setError('Connexion impossible'); reject(); };
      ws.onclose = () => { setConnected(false); };

      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }

        if (msg.type === 'room-created') setRoomCode(msg.code);
        if (msg.type === 'joined') setRoomCode(msg.code);
        if (msg.type === 'player-joined') setPlayers(msg.players);
        if (msg.type === 'player-left') setPlayers(msg.players);
        if (msg.type === 'player-list') setPlayers(msg.players);
        if (msg.type === 'error') setError(msg.message);

        for (const handler of handlersRef.current) handler(msg);
      };
    });
  }, []);

  const createRoom = useCallback(async () => {
    await connect();
    wsRef.current.send(JSON.stringify({ type: 'create-room' }));
  }, [connect]);

  const joinRoom = useCallback(async (code, name) => {
    await connect();
    wsRef.current.send(JSON.stringify({ type: 'join-room', code, name }));
  }, [connect]);

  const sendToPlayers = useCallback((data) => {
    wsRef.current?.send(JSON.stringify({ type: 'to-players', data }));
  }, []);

  const sendToPlayer = useCallback((name, data) => {
    wsRef.current?.send(JSON.stringify({ type: 'to-player', name, data }));
  }, []);

  const sendToHost = useCallback((data) => {
    wsRef.current?.send(JSON.stringify({ type: 'to-host', data }));
  }, []);

  const onMessage = useCallback((handler) => {
    handlersRef.current.push(handler);
    return () => { handlersRef.current = handlersRef.current.filter(h => h !== handler); };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setRoomCode(null);
    setPlayers([]);
    setError(null);
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  return {
    connected, roomCode, players, error,
    createRoom, joinRoom,
    sendToPlayers, sendToPlayer, sendToHost,
    onMessage, disconnect,
  };
}
