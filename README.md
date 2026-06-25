# 🎓 QR Attendance System

A web-based attendance management system that allows instructors to create attendance sessions using QR codes and enables students to submit attendance records quickly and efficiently.

The project was developed as an academic full-stack web application to demonstrate QR code generation, attendance tracking, file processing, and secure client-server communication.

---

## 📸 Screenshots

### Home Page

<img width="1293" height="666" alt="Ekran görüntüsü 2026-06-25 134057" src="https://github.com/user-attachments/assets/6f986a6b-b083-45d5-a875-68d97f0d6e0f" />

### Teacher Panel

<img width="1286" height="886" alt="Ekran görüntüsü 2026-06-25 134123" src="https://github.com/user-attachments/assets/f71700ee-79de-48f4-9cd0-148b74016c69" />

### Student Panel

<img width="1282" height="754" alt="Ekran görüntüsü 2026-06-25 134150" src="https://github.com/user-attachments/assets/c6fb6f53-01ab-41d1-854e-a2002cbc87e5" />

### Attendance Report

<img width="616" height="167" alt="Ekran görüntüsü 2026-06-25 135451" src="https://github.com/user-attachments/assets/65cbb36c-903f-4bd3-a50c-d370dccf5e8a" />

---

## 🚀 Features

### Teacher Panel

* Create attendance sessions
* Enter teacher and course information
* Set attendance duration
* Upload student lists using Excel or CSV files
* Generate dynamic QR codes
* Refresh QR codes during a session
* View attendance records
* Filter attendance results
* Manually add students
* Reset attendance data
* Export attendance reports to Excel

### Student Panel

* Access attendance form through QR code scanning
* Enter student ID
* Enter full name
* Submit attendance information

---

## 🔄 Attendance Workflow

1. The instructor creates a new attendance session.
2. Course information and session duration are specified.
3. A student list is uploaded via Excel or CSV.
4. The system generates a QR code for the session.
5. Students scan the QR code using their mobile devices.
6. Students enter their ID and full name.
7. Submitted information is validated against the uploaded student list.
8. Matching students are marked as present.
9. Attendance records can be viewed, filtered, and exported by the instructor.

---

## 🔐 Security Features

* JWT-based authentication support
* HMAC signature validation
* Helmet security middleware
* Express Rate Limiting
* CORS protection
* Environment variable management with dotenv
* Temporary QR session validation

> This project was developed for educational purposes. Advanced production-level security mechanisms such as device tracking or cookie-based verification were intentionally not used due to project requirements.

---

## 🛠️ Tech Stack

| Layer           | Technology                  |
| --------------- | --------------------------- |
| Frontend        | React.js                    |
| Backend         | Node.js, Express.js         |
| Database        | MongoDB, Mongoose           |
| Authentication  | JWT                         |
| Security        | Helmet, Rate Limiting, HMAC |
| File Processing | Excel / CSV                 |
| QR Generation   | QRCode                      |
| Package Manager | npm                         |

---

## 📂 Project Structure

```text
qr-attendance/
├── mongo_db/
│
├── qr-attendance-backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── index.js
│   ├── uploads/
│   ├── .env
│   └── package.json
│
├── qr-attendance-frontend/
│   ├── build/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   ├── api.js
│   │   ├── App.js
│   │   └── index.js
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone https://github.com/handedalcali/qr_attendance.git
cd qr_attendance
```

---

### Backend Setup

Navigate to the backend directory:

```bash
cd qr-attendance-backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
NODE_ENV=development
PORT=4000

LOCAL_MONGO=false

LOCAL_MONGO_URI=<your_local_mongodb_uri>
ATLAS_MONGO_URI=<your_mongodb_atlas_uri>

JWT_SECRET=<your_jwt_secret>
HMAC_SECRET=<your_hmac_secret>

TRUST_PROXY=false
```

Run the backend server:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:4000
```

---

### Frontend Setup

Navigate to the frontend directory:

```bash
cd qr-attendance-frontend
```

Install dependencies:

```bash
npm install
```

Run the React application:

```bash
npm start
```

The frontend will run on:

```text
http://localhost:3000
```

---

## 📊 Exporting Attendance Data

Attendance records can be exported as Excel files, allowing instructors to:

* Store attendance records
* Review attendance history
* Process attendance data externally
* Maintain attendance archives

---

## 🎯 Educational Purpose

This project was developed as part of an academic software engineering project. The main objective was to design and implement a practical QR-based attendance solution using modern web technologies and database management techniques.

---

## 📄 License

This project is licensed under the MIT License.

---
Special thanks to Engin Demiray ❤️
