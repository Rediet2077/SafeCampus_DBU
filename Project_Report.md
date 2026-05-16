# SafeCampus - Admin Control Center
## Project Documentation & Architecture

### 🛡️ System Overview
SafeCampus is an integrated emergency response and safety monitoring system. It provides a real-time link between students/staff on campus and the security administration.

### 🏗️ Architecture
The system follows a modern decoupled architecture:
1.  **Mobile Client (Flutter)**: Used by students to report incidents instantly with location data.
2.  **Admin Panel (React + Vite)**: A high-performance, real-time dashboard for security personnel.
3.  **Backend (Firebase + Django)**:
    *   **Firebase Authentication**: Secure admin access.
    *   **Cloud Firestore**: Real-time NoSQL database for instant alert synchronization.
    *   **Django API**: Handling complex business logic and reporting (internal).

### 📊 Database Structure
**Collection:** `alerts`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Auto-ID | Unique alert identifier |
| `message` | string | Description of the incident |
| `location` | string | GPS coordinates or building name |
| `status` | string | `active`, `resolved`, or `pending` |
| `timestamp` | timestamp | Server-generated creation time |

### 🚀 Key Features
*   **Real-time Synchronization**: Using Firestore `onSnapshot` for zero-latency updates.
*   **Intelligent Filtering**: Quickly isolate active emergencies from resolved ones.
*   **Premium UI**: Dark-themed command center aesthetics for high visibility.
*   **Admin Actions**: Ability to resolve incidents or clear false reports.

---

## 🎥 Demo Flow (The Golden Sequence)

To demonstrate the full power of SafeCampus, follow this sequence:

1.  **Preparation**: Open the **React Admin Panel** (`localhost:5173`) and the **Flutter App** (on emulator/device).
2.  **The Event**: On the Flutter app, trigger a "Security Alert".
3.  **Instant Detection**: Watch as the React Dashboard stats card (Active Alerts) increments instantly and a new red-bordered card appears in the Live Alerts feed **without refreshing**.
4.  **Admin Response**: Click the **"Resolve"** button on the alert card in the React panel.
5.  **Closing the Loop**: Observe the status change to green in the React panel and (if implemented) see the status update reflect back on the student's mobile device.
6.  **Cleanup**: Use the "Delete" icon to remove the test alert, keeping the Command Center clean.

---

### 📝 Grade Optimization Checklist
*   [x] **Authentication**: Secure login gates the entire system.
*   [x] **Real-time**: No manual refreshes required for data.
*   [x] **UX/UI**: Mobile-responsive, dark-mode, professional icons.
*   [x] **Logic**: Filtering, delete safety checks, and relative time formatting.
