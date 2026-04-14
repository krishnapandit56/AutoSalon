# AutoSalon — Technical Architecture & Current State Breakdown

This document reflects the **100% literal and exact state** of the AutoSalon codebase as it currently exists on the local machine. There are no extrapolated features or hypothetical cloud architectures included.

## 1. PRODUCT CONTEXT & OBJECTIVES
* **Goal:** A salon management platform blending real-time booking with integrated machine learning insights (Churn and Demand forecasting).
* **Architecture Style:** Fragmented Monolith. A single large Node.js server acts as the primary gateway, leaning on an independent local Python microservice for computation.
* **Stack:** React 19 (Vite), TailwindCSS, Node.js v18 (Express), MongoDB Atlas (Mongoose), Python (Flask, CatBoost, XGBoost).

## 2. SYSTEM ARCHITECTURE
The project exists entirely locally across three separated folders running on different local ports:
* **Frontend (`/frontend`):** Runs on `http://localhost:5173`. A React Vite SPA handling the UI.
* **Backend (`/backend`):** Runs on `http://localhost:5000`. A monolithic Express API containing all business, auth, and database logic.
* **ML Backend (`/ml_backend`):** Runs on `http://localhost:5005`. A Flask API exposing endpoints to run inference against static `.pkl` ML files. 

## 3. FRONTEND ENGINEERING (ACTUAL STATE)
* **Framework:** React 19.2 and Vite.
* **Routing:** `react-router-dom` handles local route switching between the Customer portal and Admin dashboards.
* **State & Real-time:** Uses standard React Hooks (`useState`, `useEffect`). Uses `socket.io-client` to listen to `slot-updated` and `booking-confirmed` events, mutating local state directly to gray out unavailable slots.
* **Data Visualization:** Utilizes `recharts` to render the Advanced Analytics dashboards.
* **Styling:** TailwindCSS is used for utility-based styling layouts.

## 4. BACKEND ENGINEERING (ACTUAL STATE)
* **API Structure:** The entire backend runs out of a single, 763-line `server.js` file mingling imports, Mongoose schemas, Socket.IO connections, and Express route logic.
* **Authentication:** Uses `jsonwebtoken` for stateless token generation and `bcryptjs` for hashing the Admin passwords prior to DB insertion.
* **Background Jobs:** Utilizes `setInterval` (polling every 30 seconds) to find and free `held` slots that have exceeded a 5-minute freeze limit. Utilizes `node-cron` to completely free all un-booked slots at 11:00 PM nightly.
* **Integrations:** Synchronously executes `twilioClient.messages.create` to send live SMS texts upon booking completion.
* **Data Parsing:** Reads an 8,000-line static CSV file (`realistic_customer_dataset_8000.csv`) entirely into server RAM via `fs.createReadStream` upon loading the Advanced Analytics route. 

## 5. DATABASE LAYER (ACTUAL STATE)
* **Connection:** Connects directly to MongoDB Atlas via Mongoose using a hardcoded connection string in `server.js`.
* **Models:** Uses explicit Mongoose schemas (`Admin`, `Booking`, `Churn`, `Inventory`, `Slot`).
* **Query Patterns:** Extremely heavy reliance on Javascript in-memory arrays. The `/api/mongo-analytics` route pulls the entire `Booking`, `Churn`, and `Inventory` collections into local memory using `.lean()`, then manually maps and constructs revenue arrays using JS `reduce` functions.
* **Database Updates:** Locking relies on sequential linear `await` promises (e.g. updating the Slot, then saving the Booking, then updating Churn).

## 6. ML / DL COMPONENT (ACTUAL STATE)
* **Training Scripts:** Two explicit Python scripts exist (`train.py` for Churn, `train_demand.py` for Demand). They load the local `.csv` file via Pandas.
* **Churn Model:** Uses `CatBoostClassifier`. It automatically processes raw categorical string features (like `city`) and exports to `catboost_model.pkl` along with a `metrics.json` file.
* **Demand Model:** Uses `XGBClassifier`. Pre-processes string features via scikit-learn `LabelEncoder` (dumped to `demand_encoders.pkl`), and exports the model to `xgboost_demand_model.pkl`.
* **Serving:** `app.py` spins up a Flask server, loads the `.pkl` models into memory once at runtime, and exposes `/predict` and `/predict-demand` routes. If Flask isn't running, Node.js contains a hard-coded heuristic block (`calculateFallbackChurn`) that spits out a fake risk score using basic math.

---

## 7. CRITICAL PROJECT DEBT & REMAINING WORK
Below is the accurate, organized list of everything that is missing from the project to reach a production-ready state:

### A. Security & Configuration
* [ ] **Hardcoded Secrets:** The MongoDB connection string, `JWT_SECRET`, Twilio Account SID, and Twilio Auth Tokens exist as plain-text strings in `server.js`. A `.env` implementation is required immediately.
* [ ] **CORS Configuration:** `cors({ origin: "*" })` exposes the API to any requesting domain.

### B. Architecture Refactoring
* [ ] **Monolith Breakdown:** `server.js` functions as a massive god-file. It must be refactored into distinct directories (e.g., `/routes`, `/controllers`, `/services`, `/config`).
* [ ] **CSV Processing:** The Advanced Analytics page loads an 8,000-line CSV into Node memory via streams. This handles poorly under scale. Data must be seeded into a MongoDB collection or fetched conditionally.

### C. Testing Deficiencies
* [ ] **Frontend:** Zero tests. Missing React Testing Library/Vitest.
* [ ] **Backend:** Zero unit or integration tests. Missing Jest/Supertest setups to validate booking logic without manually clicking the UI.
* [ ] **E2E:** No framework (like Cypress) exists to simulate race conditions.

### D. Missing DevOps & Deployment
* [ ] **No Containers:** There is no `Dockerfile` or `docker-compose.yml` to stitch the Python and Node backends together via a uniform network. 
* [ ] **No CI/CD:** No GitHub Action workflows exist to automatically build, lint, or test the code when pushed.
* [ ] **Deployability:** The project currently cannot be deployed to the cloud properly without manual server setups.

### E. Database Integrity
* [ ] **No ACID Transactions:** The `confirm-booking` route contains multiple sequential saves. If the Node server crashes halfway, a Slot could be marked "Booked" but the "Booking" record may fail to save, permanently dropping the slot. `mongoose.startSession()` needs implementation.
* [ ] **Indexing:** Extremely heavy `$regex` searches run on customer phone numbers across the `Churn` collection without any defined compound indices applied inside the Schema.

### F. Scalability Restrictions
* [ ] **Socket Lock-in:** `Socket.io` instances are bound to local memory. If the backend spans across two servers/terminals, socket events won't broadcast globally. Needs `socket.io-redis-adapter`.
* [ ] **ML Automation:** ML training is purely manual. There is no automated retraining script, no database listener, and the models degrade statically without active intervention.
