const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Backend is running!');
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
        childSocketId: null,
        isLocked: false,
        status: 'Pending',
        bannedKeywords: bannedKeywords || ['guns', 'drugs', 'porn', 'suicide']
     };
     console.log(`Parent ${socket.id} registered ID: ${cleanId}`);
     socket.join(cleanId);
  });


  socket.on('toggle-lock', ({ id, isLocked }) => {
     const cleanId = id.trim().toUpperCase();
     if(childrenData[cleanId]) {
       childrenData[cleanId].isLocked = isLocked;
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
