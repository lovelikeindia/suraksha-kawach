# 🛡️ Suraksha Kawach

**Suraksha Kawach** (Parent Guard) is a powerful, real-time parental control system designed to provide a safe digital environment for children. It allows parents to monitor device activity, block screens instantly, and receive alerts for sensitive web searches.

## 🌟 Key Features

### 👨‍👩‍👧‍👦 Parent Dashboard
- **Instant Device Lock**: Lock/Unlock child devices with a single tap.
- **Live Activity Tracking**: Real-time monitoring of active apps (YouTube, Instagram, etc.).
- **Smart Web Alerts**: Get notified when children search for restricted keywords.
- **Call Logs**: View recent incoming and outgoing calls.
- **Multi-Child Support**: Manage multiple children from a single dashboard.

### 👶 Child Mode
- **Safe Environment**: A simplified, monitored interface for children.
- **Background Reporting**: Invisible activity tracking for safety.
- **Restricted Access**: Built-in safety filters for web browsing.

### 🛠️ Admin Panel
- **User Management**: Approve or block parent accounts to maintain system integrity.
- **System Overview**: Monitor overall system health and database activity.

## 🚀 Tech Stack

- **Frontend**: [React.js](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
- **Real-Time Engine**: [Socket.io](https://socket.io/)
- **State Management**: React Hooks & LocalStorage

## 🏁 Getting Started

### 1️⃣ Backend Setup
```bash
cd parenguard-backend
npm install
npm start
```
*Backend runs on `http://localhost:3000`*

### 2️⃣ Combined App Setup (Parent & Child)
```bash
cd parenguard
npm install
npm run dev
```
*Default: `http://localhost:5173`*

> [!NOTE]
> The Parent and Child interfaces are now integrated into a single application. You can switch between roles directly from the main screen.

## 🔐 Admin Credentials
- **Role**: Super Admin
- **Password**: `2525`

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

---
**Developed with ❤️ for Child Safety.**
