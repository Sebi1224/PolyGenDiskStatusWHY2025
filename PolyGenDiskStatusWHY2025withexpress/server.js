const express = require('express');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'state.json');

let sharedState = {
  discs: {},
  teams: {},
  players: {}
};

// Load saved state from disk on startup
function loadState() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      sharedState = JSON.parse(raw);
      console.log('Loaded saved state from disk.');
    } catch (e) {
      console.error('['+ new Date().toLocaleString('de-DE', {
  year: 'numeric',
  month: '2-digit',  
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}) + ']: Failed to load saved state:', e);
    }
  }
}

// Save current state to disk with debounce
let saveTimeout = null;
function saveState() {
  if (saveTimeout) return; // already scheduled
  saveTimeout = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(sharedState, null, 2), err => {
      if (err) console.error('Failed to save state:', err);
      else console.log('['+ new Date().toLocaleString('de-DE', {
  year: 'numeric',
  month: '2-digit',  
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}) + ']: State saved to disk.');
      saveTimeout = null;
    });
  }, 2000); // save at most once every 2 seconds
}

// Helper to parse IDs from messages
function getIds(msg) {
  return {
    teamId: msg.teamID ?? msg.teamId ?? msg.teamid,
    playerId: msg.playerID ?? msg.playerId ?? msg.playerid,
    playerName: msg.playerName ?? msg.playername ?? msg.name,
    discId: msg.discID ?? msg.discId ?? msg.discid,
  };
}

// MQTT connection setup
const MQTT_URL = 'ws://YOUR_MQTT_BROKER_IP:9001'; // Change if needed
const client = mqtt.connect(MQTT_URL);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('#', err => {
    if (err) console.error('Failed to subscribe:', err);
  });
});

client.on('error', err => {
  console.error('MQTT error:', err);
});

client.on('message', (topic, message) => {
  let msg;
  try {
    msg = JSON.parse(message.toString());
  } catch (e) {
    console.warn('Invalid JSON message:', message.toString());
    return;
  }

  const now = Date.now();
  const { teamId, playerId, playerName, discId } = getIds(msg);

  if (topic.includes('teams') || topic.endsWith('teams')) {
    if (teamId != null) {
      sharedState.teams[teamId] = msg.teamname || msg.teamName || `Team ${teamId}`;
      saveState();
    }
    return;
  }

  if (topic.includes('players')) {
    // Bulk player update
    if (typeof msg === 'object' && !Array.isArray(msg) && Object.values(msg).every(v => v && v.playerid !== undefined)) {
      for (const [pid, pdata] of Object.entries(msg)) {
        sharedState.players[pid] = pdata.playername || pdata.name || `Player ${pid}`;
      }
      saveState();
      return;
    }

    // Single player update
    let pid = playerId;
    if (pid == null) {
      const parts = topic.split('/');
      const pIdx = parts.indexOf('players');
      if (pIdx !== -1 && parts.length > pIdx + 1) pid = parts[pIdx + 1];
    }
    if (pid != null) {
      sharedState.players[pid] = playerName || msg.player || `Player ${pid}`;
      // Update discs referencing this player
      for (const d of Object.values(sharedState.discs)) {
        if (d.lastClaimerId != null && String(d.lastClaimerId) === String(pid)) {
          d.lastClaimerName = sharedState.players[pid];
        }
      }
      saveState();
    }
    return;
  }

  if (topic.includes('discsonline') || topic.endsWith('discsonline')) {
    if (discId == null) return;
    sharedState.discs[discId] = Object.assign(sharedState.discs[discId] || {}, {
      discid: discId,
      discname: msg.discname || msg.discName || sharedState.discs[discId]?.discname,
      ownerteam: msg.ownerteam ?? teamId ?? sharedState.discs[discId]?.ownerteam,
      mapx: msg.mapx,
      mapy: msg.mapy,
      last: now,
    });
    saveState();
    return;
  }

  if (topic.includes('discsoffline') || topic.endsWith('discsoffline')) {
    if (discId == null) return;
    delete sharedState.discs[discId];
    saveState();
    return;
  }

  if (topic.match(/disccaptured$|discdiscovered$|discboosted$/) || 
      ['disccaptured', 'discdiscovered', 'discboosted'].some(e => topic.includes(e))) {
    if (discId == null) return;

    if (!sharedState.discs[discId]) sharedState.discs[discId] = { discid: discId };

    if (sharedState.discs[discId].ownerteam !== teamId) {
      sharedState.discs[discId].ownerteam = teamId;
      sharedState.discs[discId].lastTeamChangeTimestamp = now;
    }
    sharedState.discs[discId].last = now;

    if (playerName) {
      sharedState.discs[discId].lastClaimerId = playerId ?? sharedState.discs[discId].lastClaimerId;
      sharedState.discs[discId].lastClaimerName = playerName;
    } else if (playerId != null) {
      sharedState.discs[discId].lastClaimerId = playerId;
      sharedState.discs[discId].lastClaimerName = sharedState.players[playerId] || null;
    }
    saveState();
    return;
  }
});

const knownIps = new Set();

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!knownIps.has(ip)) {
    knownIps.add(ip);

    const now = new Date().toISOString();
    const userAgentString = req.headers['user-agent'] || 'Unknown User-Agent';

    console.log(`[${now}] Neue Verbindung von IP: ${ip}`);
    console.log(`User-Agent: ${userAgentString}`);
  }
  next();
});



// Serve static files from "public" folder (put index.html there)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get the current state
app.get('/api/state', (req, res) => {
  res.json(sharedState);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Load saved state on startup
loadState();

