const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const DATA_FILE = path.join(__dirname, 'children.json');

// Load Data
let childrenData = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    childrenData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Reset status and socket IDs on restart
    for (let id in childrenData) {
      childrenData[id].parentSocketId = null;
      childrenData[id].childSocketId = null;
      childrenData[id].status = 'Offline';
    }
    console.log('Loaded persisted data from children.json');
  } catch (e) {
    console.error('Error loading children.json:', e);
  }
}

const saveToDisk = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(childrenData, null, 2));
  } catch (e) {
    console.error('Error saving children.json:', e);
  }
};

app.get('/', (req, res) => {

  const ids = Object.keys(childrenData);
  let html = `
    <html>
      <head><title>Suraksha Kawach Status</title><style>body{font-family:sans-serif;padding:20px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;}</style></head>
      <body>
        <h1>Suraksha Kawach Backend</h1>
        <p>Current Server Time: ${new Date().toLocaleTimeString()}</p>
        <h2>Registered IDs: ${ids.length}</h2>
        <table>
          <tr><th>SK ID</th><th>Name</th><th>Device</th><th>Status</th></tr>
          ${ids.map(id => `<tr><td>${id}</td><td>${childrenData[id].name}</td><td>${childrenData[id].device}</td><td>${childrenData[id].status}</td></tr>`).join('')}
        </table>
        <p><i>Note: Refresh the page to see live updates.</i></p>
      </body>
    </html>
  `;
  res.send(html);
});



const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const childrenData = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('parent-register', ({ id, name, device, bannedKeywords }) => {
     const cleanId = id.trim().toUpperCase();
     childrenData[cleanId] = {
        name,
        device,
        parentSocketId: socket.id,
        childSocketId: childrenData[cleanId] ? childrenData[cleanId].childSocketId : null,
        isLocked: childrenData[cleanId] ? childrenData[cleanId].isLocked : false,
        status: childrenData[cleanId] ? childrenData[cleanId].status : 'Pending',
        bannedKeywords: bannedKeywords || ['guns', 'drugs', 'porn', 'suicide']
     };
     saveToDisk();
     console.log(`Parent ${socket.id} registered ID: ${cleanId}`);
     socket.join(cleanId);
  });



  socket.on('toggle-lock', ({ id, isLocked }) => {
     const cleanId = id.trim().toUpperCase();
     if(childrenData[cleanId]) {
       childrenData[cleanId].isLocked = isLocked;
       saveToDisk();
       io.to(cleanId).emit('lock-status-changed', isLocked);
       console.log(`Parent toggled lock for ${cleanId} to ${isLocked}`);
     }
  });



  socket.on('child-link', (id) => {
     const cleanId = id.trim().toUpperCase();
     console.log(`Child ${socket.id} attempting to link with ID: ${cleanId}`);
     if(childrenData[cleanId]) {
       childrenData[cleanId].childSocketId = socket.id;
       childrenData[cleanId].status = 'Online';
       socket.join(cleanId);
       
       socket.emit('link-success', { name: childrenData[cleanId].name, isLocked: childrenData[cleanId].isLocked });
       
       io.to(childrenData[cleanId].parentSocketId).emit('child-status-changed', { id: cleanId, status: 'Online' });
       console.log(`Child linked successfully to ID: ${cleanId}`);
     } else {
       console.log(`Link Error: ID ${cleanId} not found in database. Current IDs: ${Object.keys(childrenData).join(', ')}`);
       socket.emit('link-error', 'Galat ID! Pehle Parent App mein register karein.');
     }
  });


  socket.on('update-keywords', ({ id, bannedKeywords }) => {
     const cleanId = id.trim().toUpperCase();
     if(childrenData[cleanId]) {
        childrenData[cleanId].bannedKeywords = bannedKeywords;
        saveToDisk();
        console.log(`Parent updated keywords for ID: ${cleanId}`);
     }
  });



  socket.on('perform-search', ({ id, keyword, timestamp }) => {
     const cleanId = id.trim().toUpperCase();
     if(childrenData[cleanId]) {
        if(childrenData[cleanId].parentSocketId) {
           io.to(childrenData[cleanId].parentSocketId).emit('incoming-activity-log', { id: cleanId, app: 'Browser', detail: `Searched for: "${keyword}"`, timestamp });
        }


        const lowerKeyword = keyword.toLowerCase();
        const isBad = (childrenData[id].bannedKeywords || []).some(bad => lowerKeyword.includes(bad.toLowerCase()));
        
        if(isBad) {
           console.log(`Alert: Child ${id} searched for restricted keyword: ${keyword}`);
           if(childrenData[id].parentSocketId) {
              io.to(childrenData[id].parentSocketId).emit('search-alert', { id, keyword, timestamp });
           }
        }
     }
  });

  socket.on('track-activity', ({ id, app, detail, timestamp }) => {
     const cleanId = id.trim().toUpperCase();
     if(childrenData[cleanId]) {
        console.log(`Activity [${app}]: Child ${cleanId} is ${detail}`);
        if(childrenData[cleanId].parentSocketId) {
           io.to(childrenData[cleanId].parentSocketId).emit('incoming-activity-log', { id: cleanId, app, detail, timestamp });
        }

     }
  });

  socket.on('disconnect', () => {
    for (const [id, data] of Object.entries(childrenData)) {
       if (data.childSocketId === socket.id) {
          data.childSocketId = null;
          data.status = 'Offline';
          if (data.parentSocketId) {
             io.to(data.parentSocketId).emit('child-status-changed', { id, status: 'Offline' });
          }
          console.log(`Child for ID ${id} disconnected`);
       }
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
