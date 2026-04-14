# 🚀 Project Fix & Upgrade Execution Plan

This plan provides a high-velocity, staged approach to transforming the **AutoSalon** prototype into an enterprise-grade production system.

---

## 1. 🧭 EXECUTION STRATEGY

*   **Approach:** Security-First ➔ Reliability ➔ Scalable Distribution. We will first plug the critical security holes, then refactor the core architecture to prevent system crashes, and finally implement distributed scaling and ML automation.
*   **Key Priorities:**
    1.  Secret management and network security.
    2.  Database transactional integrity.
    3.  Architecture refactoring (De-coupling the monolith).
    4.  Containerization and Production-grade monitoring.
*   **Assumptions:** Access to a Git provider (GitHub/GitLab) and a cloud provider (AWS/Render/Railway) is available. Node.js and Python environments remain the primary runtimes.

---

## 2. 🔴 PHASE 1 — CRITICAL FIXES (BLOCKERS)

### Task 1.1: Environment Variable Injection & Secret Sanitization
*   **Problem:** Hardcoded credentials are committed to Git.
*   **Implementation Steps:**
    1.  Install `dotenv` in `/backend`.
    2.  Create `.env` and migrate `MONGO_URI`, `JWT_SECRET`, `TWILIO_SID`, and `TWILIO_TOKEN`.
    3.  Update `server.js` to use `process.env`.
    4.  Add `.env` to `.gitignore`.
    5.  **Critical:** Use [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) or `git-filter-repo` to purge history of the leaked strings.
*   **Tools:** `dotenv`.
*   **Outcome:** Security compliance; credentials safe from external scraping.

### Task 1.2: API Shielding (CORS & Rate Limiting)
*   **Problem:** API is wide open to DDoS and cross-site hijacking.
*   **Implementation Steps:**
    1.  Update `cors()` middleware to allow only the specific production/dev frontend URLs.
    2.  Install `express-rate-limit`.
    3.  Apply strict limits (e.g., 5 holds per window) to `/api/hold-slot` and `/api/confirm-booking` to prevent Twilio balance drain and slot exhaustion.
*   **Tools:** `express-rate-limit`.
*   **Outcome:** Prevents bot-driven service denial and financial loss.

### Task 1.3: ACID Database Transactions
*   **Problem:** Partial saves leading to "zombie" slots if the server crashes.
*   **Implementation Steps:**
    1.  Implement Mongoose Transactions in `/api/confirm-booking`.
    2.  Wrap `Slot.updateOne`, `Booking.save`, and `Churn.save` in a `session.withTransaction()` block.
*   **Outcome:** Guaranteed data consistency; no more stranded "Locked" slots.

---

## 3. 🟠 PHASE 2 — STABILITY & SCALABILITY

### Task 2.1: CSV to MongoDB Migration
*   **Problem:** Parsing 8k rows in Node RAM is a memory leak risk.
*   **Implementation Steps:**
    1.  Create a one-time migration script to seed `realistic_customer_dataset_8000.csv` into a new `HistoricalData` MongoDB collection.
    2.  Replace `fs.createReadStream` logic in `server.js` with indexed MongoDB queries.
*   **Outcome:** Sub-100ms analytics response times; zero RAM overhead.

### Task 2.2: Domain-Driven Refactoring (The "God-File" Split)
*   **Problem:** `server.js` is a maintenance nightmare.
*   **Implementation Steps:**
    1.  Establish `/routes`, `/controllers`, `/models`, and `/services` directories.
    2.  Separate Twilio logic into a `NotificationService`.
    3.  Separate ML fetch logic into an `AIService`.
*   **Outcome:** Readable, maintainable, and testable codebase.

### Task 2.3: Dockerization & Orchestration
*   **Problem:** Manual multi-terminal startup prevents cloud deployment.
*   **Implementation Steps:**
    1.  Generate `Dockerfile` for Frontend (Nginx), Backend (Node), and ML (Python).
    2.  Create `docker-compose.yml` to network all three.
*   **Outcome:** Single-command startup (`docker-compose up`); production-environment parity.

---

## 4. 🟢 PHASE 3 — ADVANCED IMPROVEMENTS

*   **Task 3.1: Horizontal Scaling:** Implement `socket.io-redis-adapter` to allow multiple Node instances to sync slot states.
*   **Task 3.2: ML Automation:** Implement an automated retraining trigger in Python that re-fits models every Sunday based on fresh MongoDB exports.
*   **Task 3.3: APM & Logging:** Replace `console.log` with `Winston` and integrate `Sentry` for real-time error tracking.

---

## 5. ⚙️ TASK BREAKDOWN

| Task ID | Description | Difficulty | Dependencies |
| :--- | :--- | :--- | :--- |
| T1.1 | Secret Management (.env) | Easy | None |
| T1.2 | Rate Limiting & CORS | Easy | T1.1 |
| T1.3 | Mongoose Transactions | Medium | None |
| T2.1 | CSV Migration to Mongo | Medium | T1.1 |
| T2.2 | Refactor server.js (MVC) | Hard | T1.3 |
| T2.3 | Docker Compose Setup | Medium | T2.2 |
| T3.1 | Redis Socket Adapter | Medium | T2.3 |
| T3.2 | ML Retraining Pipeline | Hard | T2.1 |

---

## 6. 🧱 SYSTEM REDESIGN

**Improved Pattern: Service-Oriented Architecture**
1.  **Gateway Service (Express):** Purely handles routing, Auth, and WebSockets.
2.  **ML Microservice (Flask):** Purely handles inference.
3.  **Data Persistence Layer:** MongoDB + Redis (for socket state and feature caching).
4.  **Worker Service:** Handles asynchronous Twilio SMS delivery via a queue.

---

## 7. 🤖 ML FIXES

1.  **Feature Store Implementation:** Unify the data format between MongoDB and Python models within the `AIService` layer to stop on-the-fly mapping hacks.
2.  **Hyperparameter Optimization:** Run `Optuna` or `GridSearchCV` on the existing CatBoost scripts to refine the `max_depth` and `iterations` based on the 8k dataset.
3.  **Threshold Calibration:** Move from pure 0/1 classification to probability-based triggers for "High Risk" notifications.

---

## 8. 🚀 DEPLOYMENT UPGRADE PLAN

1.  **CI/CD:** Setup GitHub Actions to run `npm test` and `docker build` on every PR.
2.  **Environment Separation:** Instantiate `salon-prod` and `salon-dev` clusters in MongoDB Atlas and AWS.
3.  **Health Checks:** Implement `/health` endpoints in Node and Python for load balancer liveness probes.

---

## 9. ⏱️ EXECUTION TIMELINE

*   **Week 1 (Crits):** Secrets, Security, ACID Transactions, and CORS.
*   **Week 2 (Build):** MVC Refactoring and CSV-to-DB Migration.
*   **Week 3 (Deploy):** Dockerization and GitHub Actions.
*   **Week 4 (Optimize):** Redis implementation and ML retraining automation.

---

## 10. 🧠 FINAL OUTCOME

The system will transition from a local script-based prototype to a **Dockerized Distributed Micro-system**. It will be immune to hardcoded credential leaks, resistant to DDoS slot-holding, and statistically stable under high concurrent booking loads. The data pipeline will be fully indexed, and the AI models will self-improve weekly, making it fully ready for a production launch.
