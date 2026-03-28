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
     childrenData[id] = {
        name,
        device,
        parentSocketId: socket.id,
        childSocketId: null,
        isLocked: false,
        status: 'Pending',
        bannedKeywords: bannedKeywords || ['guns', 'drugs', 'porn', 'suicide']
     };
     console.log(`Parent ${socket.id} created child ID ${id}`);
     socket.join(id);
  });

  socket.on('toggle-lock', ({ id, isLocked }) => {
     if(childrenData[id]) {
       childrenData[id].isLocked = isLocked;
       io.to(id).emit('lock-status-changed', isLocked);
       console.log(`Parent toggled lock for ${id} to ${isLocked}`);
     }
  });

  socket.on('child-link', (id) => {
     if(childrenData[id]) {
       childrenData[id].childSocketId = socket.id;
       childrenData[id].status = 'Online';
       socket.join(id);
       
       socket.emit('link-success', { name: childrenData[id].name, isLocked: childrenData[id].isLocked });
       
       io.to(childrenData[id].parentSocketId).emit('child-status-changed', { id, status: 'Online' });
       console.log(`Child ${socket.id} linked to ID ${id}`);
     } else {
       socket.emit('link-error', 'Galat ID! Ye bacha register nai hai.');
     }
  });

  socket.on('update-keywords', ({ id, bannedKeywords }) => {
     if(childrenData[id]) {
        childrenData[id].bannedKeywords = bannedKeywords;
        console.log(`Parent updated keywords for ID ${id}`);
     }
  });

  socket.on('perform-search', ({ id, keyword, timestamp }) => {
     if(childrenData[id]) {
        if(childrenData[id].parentSocketId) {
           io.to(childrenData[id].parentSocketId).emit('incoming-activity-log', { id, app: 'Browser', detail: `Searched for: "${keyword}"`, timestamp });
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
     if(childrenData[id]) {
        console.log(`Activity [${app}]: Child ${id} is ${detail}`);
        if(childrenData[id].parentSocketId) {
           io.to(childrenData[id].parentSocketId).emit('incoming-activity-log', { id, app, detail, timestamp });
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
