# [Sanatan Ayurveda Backend Demo]

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node->=14.0.0-brightgreen.svg)

[A lightweight, modular backend that supports audio/video calling, real-time chat rooms, doctor–patient availability tracking, and WebRTC signaling using WebSockets.]

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)

## 🛠 Prerequisites

Before you begin, ensure you have met the following requirements:

* **Node.js**: v[14.x] or higher installed.
* **npm** or **yarn**: Package manager installed.

## 🚀 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Raghavv5846/telemed-backend.git
    cd telemd-backend
    ```

2.  **Install dependencies:**
    ```bash
    # If using npm
    npm install

    # If using yarn
    yarn install
    ```

## 🔐 Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file.

1.  Create a file named `.env` in the root directory.
2.  Copy the contents of `.env.example` (if available) or add the following:

```env
PORT=3000
NODE_ENV=dev
JWT_SECRET='TELE_MED_SECRET_KEY'
```

## 🚀 Running the Project
1.  Developement
    (Runs the server with nodemon ,restarts on file changes).
```
npm run dev
```
or
```
yarn dev
```
