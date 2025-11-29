# Nexcho

**Nexcho** is a full-stack video conferencing web application built using React (frontend), Node.js with Express (backend), and MongoDB for the database. It supports user registration with email verification, login, meeting creation/joining, and meeting history.

---

## Features

- User registration with email verification
- Secure login with JWT tokens
- Password reset via email
- Create and join video meetings
- Meeting history per user
- Responsive UI built with Material UI
- MongoDB Atlas cloud database

---

## Technologies Used

- Frontend:

  - React
  - Material UI
  - Axios (for API calls)

- Backend:
  - Node.js
  - Express.js
  - MongoDB with Mongoose
  - bcrypt (password hashing)
  - nodemailer (email service)
  - crypto (token generation)

---

## Prerequisites

- Node.js (v16 or above recommended)
- npm (comes with Node.js)
- MongoDB Atlas account (or local MongoDB)
- Google Gmail account with app password for sending emails (used in nodemailer)


## Installation

1. Clone the repo

```

git clone https://github.com/avipsajoshi/nexcho.git

cd nexcho

```

2. Frontend (in a new terminal)
```
cd frontend

npm i

npm start  # starts server

```

3. Backend (in a new terminal)
```
cd backend

npm i

npm run dev #starts server

```

4. Python Backend (in a new terminal)
```
cd ml-backend

python -m venv venv

venv\Scripts\activate   # on Windows

source venv/bin/activate # on Linux/macOS

pip install -r requirements.txt

python app.py # starts server

```

5. Open browser in given url