// MQTTProxy.js
const aedes = require('aedes')();
const net = require('net');
const ws = require('ws');
const mqtt = require('mqtt');

const PORT_WS = 9001;
const REMOTE_MQTT = 'mqtt://mqtt.gen.polyb.io:1883';

// 1) Start local Aedes MQTT-Broker (intern)
const server = net.createServer(aedes.handle);
server.listen(1884, () => {
  console.log('Local MQTT Broker is running on TCP 1884');
});

// 2) WebSocket-Server for Browser
const wss = new ws.Server({ port: PORT_WS });
wss.on('connection', (socket) => {
  console.log('Browser connected via WebSocket');

  // Link Aedes with WebSocket
  const wsStream = ws.createWebSocketStream(socket);
  aedes.handle(wsStream);

  socket.on('close', () => {
    console.log('Browser conntection cloased');
  });
});

// 3) Connect as Client to the real Broker
const remoteClient = mqtt.connect(REMOTE_MQTT);

remoteClient.on('connect', () => {
  console.log('Conntected to remote MQTT Broker');
  // subscribe everything, that the local broker can forward it
  remoteClient.subscribe('#');
});

remoteClient.on('message', (topic, message) => {
  // when a message from the broker is recived publsh it local in Aedes
  aedes.publish({ topic, payload: message });
});

// 4) When the Client (Browser) something publishs, forward it to remote
aedes.on('publish', (packet, client) => {
  // when publish from Browser (client != null), send remote
  if(client){
    remoteClient.publish(packet.topic, packet.payload);
  }
});

console.log(`WebSocket MQTT Proxy is running on ws://localhost:${PORT_WS}`);

