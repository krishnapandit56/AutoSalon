# 💇 AutoSalon — Smart Salon Management System

A full-stack salon management platform with real-time slot booking, admin analytics, customer churn prediction, and demand forecasting powered by machine learning.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **ML Backend** | Python, Flask, CatBoost, XGBoost |
| **Auth** | JWT + bcryptjs |
| **SMS** | Twilio |
| **Scheduling** | node-cron |

---

## 📁 Project Structure

```
AutoSalon/
├── backend/                    # Node.js + Express REST API
│   ├── models/                 # Mongoose schemas (Slot, Booking, Churn, Inventory, Admin)
│   ├── server.js               # Main API gateway (routes, auth, socket.io)
│   └── package.json
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   └── pages/
│   │       ├── Customer.jsx        # Customer booking portal
│   │       ├── Admin.jsx           # Admin dashboard
│   │       ├── AdvancedAnalytics.jsx  # Revenue & ML analytics charts
│   │       └── AdminAuth.jsx       # Admin login page
│   └── package.json
│
├── ml_backend/                 # Python ML microservice (port 5005)
│   ├── app.py                  # Flask prediction API
│   ├── train.py                # CatBoost churn model training
│   ├── train_demand.py         # XGBoost demand forecasting training
│   ├── generate_dataset.py     # Synthetic dataset generation
│   ├── catboost_model.pkl      # Trained churn model
│   ├── xgboost_model.pkl       # Trained demand model
│   ├── encoders.pkl            # Label encoders for churn features
│   ├── demand_encoders.pkl     # Label encoders for demand features
│   └── requirements.txt
│
├── realistic_customer_dataset_8000.csv   # Dataset for advanced analytics
└── README.md
```

---

## ✨ Features

### 👥 Customer Portal
- Browse available time slots (11 AM – 10 PM, 30-min intervals)
- Real-time slot locking (5-min hold) via Socket.IO
- Book across 12 services with 3 expertise levels (Basic / Intermediate / Expert)
- SMS confirmation via Twilio upon successful booking

### 🛠️ Admin Dashboard
- Secure JWT-based login
- View all bookings and manage inventory
- Release held/expired slots
- View customer churn risk data

### 📊 Advanced Analytics Dashboard
- Revenue breakdown: Daily, Weekly, Monthly
- Service performance rankings
- Top customers by total spend
- Booking source distribution
- Churn risk category distribution
- **ML-powered demand forecast** (tomorrow + next month predicted revenue)

### 🤖 ML Backend
- **Churn Prediction** — CatBoost classifier predicts whether a customer is likely to churn, with a heuristic fallback if the ML service is unavailable
- **Demand Forecasting** — XGBoost model predicts upcoming salon demand (Low / Medium / High)

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Python >= 3.9
- MongoDB Atlas account (or local MongoDB)
- Twilio account (optional, for SMS)

---

### 1. Clone the Repository

```bash
git clone https://github.com/krishnapandit56/AutoSalon.git
cd AutoSalon
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

> ⚠️ Before running, configure environment variables (see [Environment Variables](#environment-variables) section below).

```bash
node server.js
```

Backend runs on **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

### 4. ML Backend Setup

```bash
cd ml_backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate     # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
python app.py
```

ML Backend runs on **http://localhost:5005**

---

## 🔐 Environment Variables

> ⚠️ **Important:** The current codebase has hardcoded secrets. Before deploying or sharing, move these to a `.env` file.

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/salon_db
JWT_SECRET=your_jwt_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=+1xxxxxxxxxx
PORT=5000
```

---

## 📡 API Endpoints

### Public
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/slots` | Get all available slots |
| `POST` | `/api/hold-slot` | Hold a slot for 5 minutes |
| `POST` | `/api/confirm-booking` | Confirm a booking |
| `POST` | `/api/admin/login` | Admin login |
| `POST` | `/api/admin/register` | Register new admin |

### Protected (JWT Required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bookings` | Get all bookings |
| `GET` | `/api/inventory` | Get inventory |
| `POST` | `/api/inventory` | Add inventory item |
| `PUT` | `/api/inventory/:id` | Update inventory item |
| `DELETE` | `/api/inventory/:id` | Delete inventory item |
| `GET` | `/api/churn` | Get churn data |
| `POST` | `/api/churn/predict` | Predict churn for a customer |
| `GET` | `/api/advanced-analytics` | Get CSV-based analytics |
| `GET` | `/api/mongo-analytics` | Get live MongoDB analytics |

### ML Backend (Port 5005)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Predict customer churn |
| `POST` | `/predict-demand` | Predict demand level |

---

## 🧠 ML Models

### Churn Prediction (CatBoost)
- **Input features**: age, gender, city, membership type, total visits, days since last visit, avg spend, ratings, complaints, booking source, etc.
- **Output**: `churn` (0/1), `churn_risk` (%), `risk_level` (Low / Medium / High)
- **Fallback**: If the ML backend is down, `server.js` computes a heuristic risk score automatically.

### Demand Forecasting (XGBoost)
- **Input**: Batch of recent customer booking records
- **Output**: Demand distribution (Low / Medium / High) + dominant demand level

---

## ⚠️ Known Issues / Technical Debt

- [ ] Hardcoded MongoDB URI, Twilio credentials, and JWT secret in `server.js` — move to `.env`
- [ ] `server.js` is a monolith (763 lines) — should be split into route files
- [ ] No automated tests (unit or integration)
- [ ] ML models are committed as binary `.pkl` files — should use model registry or DVC
- [ ] Large CSV datasets committed to Git — should be excluded via `.gitignore`

---

## 📄 License

This project is for academic/personal use. Not licensed for commercial distribution.

---

## 👤 Author

**Krishna Pandit**  
GitHub: [@krishnapandit56](https://github.com/krishnapandit56)
