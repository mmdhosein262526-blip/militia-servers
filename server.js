const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Mini Militia Server is running!\n');
});

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ server });

const players = new Map();
let nextId = 1;

wss.on('connection', (ws) => {
  const id = nextId++;
  const player = {
    id: id,
    name: 'Player ' + id,
    x: 400, y: 200,
    facing: 1, vx: 0, vy: 0,
    health: 100, alive: true,
    ws: ws
  };
  players.set(id, player);
  console.log('Player ' + id + ' connected. Total: ' + players.size);

  ws.send(JSON.stringify({
    type: 'welcome',
    id: id,
    players: getPlayersList()
  }));

  broadcast({
    type: 'playerJoined',
    player: sanitize(player)
  }, id);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'update') {
        player.x = msg.x;
        player.y = msg.y;
        player.vx = msg.vx;
        player.vy = msg.vy;
        player.facing = msg.facing;
        player.health = msg.health;
        broadcast({
          type: 'playerUpdate',
          id: id,
          x: msg.x, y: msg.y,
          vx: msg.vx, vy: msg.vy,
          facing: msg.facing,
          health: msg.health
        }, id);
      }
      else if (msg.type === 'shoot') {
        broadcast({
          type: 'playerShoot',
          id: id,
          x: msg.x, y: msg.y,
          vx: msg.vx, vy: msg.vy
        }, id);
      }
      else if (msg.type === 'name') {
        player.name = msg.name;
        broadcast({
          type: 'playerName',
          id: id,
          name: msg.name
        });
      }
    } catch (e) {
      console.error('Error:', e);
    }
  });

  ws.on('close', () => {
    console.log('Player ' + id + ' disconnected');
    players.delete(id);
    broadcast({ type: 'playerLeft', id: id });
  });
});

function sanitize(p) {
  return {
    id: p.id, name: p.name,
    x: p.x, y: p.y,
    facing: p.facing,
    health: p.health,
    alive: p.alive
  };
}

function getPlayersList() {
  const arr = [];
  players.forEach(p => arr.push(sanitize(p)));
  return arr;
}

function broadcast(msg, exceptId) {
  const data = JSON.stringify(msg);
  players.forEach(p => {
    if (p.id !== exceptId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  });
}

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
