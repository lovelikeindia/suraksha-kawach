const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const DB_FILE = path.join(__dirname, 'database.json');

// --- DATABASE FUNCTIONS ---
function loadDB() {
   try {
      if (fs.existsSync(DB_FILE)) {
         return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      }
   } catch (err) {
      console.error("DB Load Error:", err);
   }
   return { parentAccounts: {}, childrenData: {} };
}

function saveDB() {
   try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 3), 'utf8');
   } catch (err) {
      console.error("DB Save Error:", err);
   }
}

const db = loadDB();
const parentAccounts = db.parentAccounts; 
const childrenData = db.childrenData; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- PARENT AUTH ---
  socket.on('parent-signup', ({ name, mobile, pin, device }) => {
     if (parentAccounts[mobile]) {
        return socket.emit('signup-error', 'Is number se account pehle se bana hai!');
     }
     parentAccounts[mobile] = {
        name,
        mobile,
        pin,
        device,
        status: 'Pending',
        socketId: socket.id
     };
     console.log(`New Parent Signup: ${name} (${mobile})`);
     socket.emit('signup-success', { status: 'Pending' });
     saveDB();
     io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
  });

  socket.on('parent-login', ({ mobile, pin }) => {
     const acc = parentAccounts[mobile];
     if (acc && acc.pin === pin) {
        acc.socketId = socket.id;
        socket.emit('login-success', { name: acc.name, status: acc.status });
        console.log(`Parent Login: ${acc.name} (${mobile})`);
        
        // Join all their children's rooms
        for (const [childId, child] of Object.entries(childrenData)) {
           if (child.parentMobile === mobile) {
              socket.join(childId);
           }
        }
     } else {
        socket.emit('login-error', 'Mobile number ya PIN galat hai!');
     }
  });

  // Parent register child
  socket.on('parent-register-child', ({ id, name, device, mobile, bannedKeywords }) => {
     // Associate child with parent mobile
     childrenData[id] = {
        name,
        device,
        parentMobile: mobile,
        childSocketId: childrenData[id]?.childSocketId || null,
        isLocked: childrenData[id]?.isLocked || false,
        status: childrenData[id]?.status || 'Pending',
        bannedKeywords: bannedKeywords || ['guns', 'drugs', 'porn', 'suicide'],
        callLogs: childrenData[id]?.callLogs || [],
        activityLogs: childrenData[id]?.activityLogs || []
     };

     socket.join(id);
     saveDB();
     io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
  });

  socket.on('toggle-lock', ({ id, isLocked }) => {
     if(childrenData[id]) {
       childrenData[id].isLocked = isLocked;
       // ID-specific event for consistency
       io.to(id).emit(`lock-status-changed:${id}`, isLocked);
       console.log(`Parent toggled lock for ${id} to ${isLocked}`);
       
       // Confirm back to parent
       socket.emit('child-lock-confirmed', { id, isLocked });
        
       // Update admin too
       saveDB();
       io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
     }
  });

  socket.on('child-link', (id) => {
     if(childrenData[id]) {
        const pStatus = parentAccounts[childrenData[id].parentMobile]?.status || 'Approved';

        if (pStatus === 'Blocked') {
           return socket.emit('link-error', 'Account Blocked.');
        }

        childrenData[id].childSocketId = socket.id;
        childrenData[id].status = 'Online';
        socket.join(id);
        
        socket.emit('link-success', { name: childrenData[id].name, isLocked: childrenData[id].isLocked });
        
        const pSocket = parentAccounts[childrenData[id].parentMobile]?.socketId;
        if (pSocket) {
           io.to(pSocket).emit('child-status-changed', { id, status: 'Online' });
        }
        saveDB();
        io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
     } else {
        socket.emit('link-error', 'Galat ID!');
     }
  });

  socket.on('track-call', ({ id, type, number, duration, timestamp }) => {
     if(childrenData[id]) {
        const newCall = { type, number, duration, timestamp };
        childrenData[id].callLogs = [newCall, ...(childrenData[id].callLogs || [])].slice(0, 50);
        
        const pSocket = parentAccounts[childrenData[id].parentMobile]?.socketId;
        if (pSocket) {
           io.to(pSocket).emit('incoming-call-log', { id, call: newCall });
        }
        saveDB();
        io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
     }
  });

  socket.on('update-keywords', ({ id, bannedKeywords, mobile }) => {
     if(childrenData[id] && parentAccounts[mobile]?.status === 'Approved') {
        childrenData[id].bannedKeywords = bannedKeywords;
        saveDB();
     }
  });

  socket.on('perform-search', ({ id, keyword, timestamp }) => {
     if(childrenData[id]) {
        const pSocket = parentAccounts[childrenData[id].parentMobile]?.socketId;
        if(pSocket) {
           io.to(pSocket).emit('incoming-activity-log', { id, app: 'Browser', detail: `Searched for: "${keyword}"`, timestamp });
        }
        const lowerKeyword = keyword.toLowerCase();
        const isBad = (childrenData[id].bannedKeywords || []).some(bad => lowerKeyword.includes(bad.toLowerCase()));
        if(isBad && pSocket) {
           io.to(pSocket).emit('search-alert', { id, keyword, timestamp });
        }
        saveDB();
        io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
     }
  });

  socket.on('track-activity', ({ id, app, detail, timestamp }) => {
     if(childrenData[id]) {
        const pSocket = parentAccounts[childrenData[id].parentMobile]?.socketId;
        if(pSocket) {
           io.to(pSocket).emit('incoming-activity-log', { id, app, detail, timestamp });
        }
        saveDB();
        io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
     }
  });

  // --- ADMIN ---
  socket.on('admin-login', (pass) => {
     if (pass === '2323' || pass === '2525') {
        socket.emit('admin-login-success', { parents: parentAccounts, children: childrenData });
     } else {
        socket.emit('admin-login-error', 'Wrong password');
     }
  });

  socket.on('admin-set-parent-status', ({ mobile, status }) => {
     if (parentAccounts[mobile]) {
        parentAccounts[mobile].status = status;
        const pSocketId = parentAccounts[mobile].socketId;
        if (pSocketId) {
           io.to(pSocketId).emit('registration-status-update', { status });
        }
        saveDB();
        io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
     }
  });

  socket.on('disconnect', () => {
    // Session cleanup
    for (const [id, data] of Object.entries(childrenData)) {
       if (data.childSocketId === socket.id) {
          data.childSocketId = null;
          data.status = 'Offline';
          const pSocket = parentAccounts[data.parentMobile]?.socketId;
          if (pSocket) {
             io.to(pSocket).emit('child-status-changed', { id, status: 'Offline' });
          }
       }
    }
    saveDB();
    io.emit('admin-data-update', { parents: parentAccounts, children: childrenData });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
