# AutoSalon — Deep Architecture & System Design Breakdown

## 1. PROBLEM & PRODUCT CONTEXT
* **Problem Statement:** Salons experience high customer churn, revenue loss due to unmanaged idle time, and lack data-driven insights to predict staffing demands and optimize scheduling without conflicts.
* **Target Users (Personas):**
  * *Salon Admin/Managers:* Need insights to maximize slot utilization, staffing, and revenue.
  * *Customers:* Need a frictionless, conflict-free way to discover and book salon services.
* **Why this matters:** The beauty industry struggles with dynamic scheduling and unpredictable walk-in demand. Misallocated resources lead to lost revenue and poor customer experiences.
* **Existing Alternatives & Gaps:** Platforms like Vagaro or Mindbody exist, but they lack out-of-the-box ML-based predictive scheduling and churn risk analysis without expensive enterprise tiering.

## 2. OBJECTIVES & METRICS
* **Business Goals:** Reduce customer churn by 15%, maximize slot utilization to >85%, and enable real-time scalable booking.
* **Technical KPIs:** `<200ms` API latency for core booking actions, `99.9%` uptime, and `<150ms` strict SLA on ML model inference times.
* **Product KPIs:** Monthly Active Customers (MAC), Slot Abandonment Rate, Churn Reactivation Rate, and Average Revenue Per Booking.

## 3. USER FLOWS & USE CASES
* **Main Customer Journey:** Visit Portal → View available slots (synced in real-time) → Select service & expertise level → Hold slot (Socket.IO locks for 5 min) → Confirm booking → Receive SMS via Twilio.
* **Main Admin Journey:** Secure Login → View real-time slots → Review Advanced Analytics (Revenue, Service popularity) → Identify high-risk churn customers via ML pipeline.
* **Edge Cases & Failure Scenarios:**
  * *Race Condition:* Two users click the same slot at the exact millisecond. (Handled via MongoDB optimistic locking and temporary socket holds).
  * *ML Microservice Down:* Handled gracefully via a static heuristic fallback encoded in the Node.js layer to prevent blocking rendering.

## 4. SYSTEM ARCHITECTURE
* **High-Level Architecture:** Microservices-adjacent architecture.
* **Architecture Type:** Split Monolith with an isolated ML Microservice.
  * **Frontend:** React 18 SPA (Vite).
  * **Backend Core:** Node.js + Express monolith handling business logic, WebSockets, and DB interfacing.
  * **ML Layer:** Python Flask REST API dedicated to heavy compute (inference).
* **Component Interactions:** The Frontend polls the Node.js API and maintains a Socket.IO connection. The Node.js server proxies specific ML requests to the Python Microservice over internal HTTP while doing synchronous DB writes to MongoDB Atlas.

## 5. DATA FLOW (VERY DETAILED)
* **Start:** User selects a 30-min slot on the React Frontend.
* **Lock Phase:** Frontend fires `POST /api/hold-slot` → Node.js API checks `Slots` collection → Attempt atomic update to lock.
* **Real-time Sync:** Node.js succeeds, HTTP 200 returned. Node.js emits a `slot_locked` event via Socket.IO. All other connected browsers instantly gray out that slot.
* **Confirmation Phase:** User submits contact info → Frontend fires `POST /api/confirm-booking` → Node.js validates payload structurally.
* **DB persistence:** Node.js creates a `Booking` document and updates the `Slot` state to permanently filled.
* **Notification:** Node.js triggers external Twilio API to dispatch a confirmation SMS.
* **End:** Frontend redirects to success state.

---

## 6. FRONTEND ARCHITECTURE (SENIOR FRONTEND ARCHITECT)

### 6.1 FRAMEWORK & RENDERING STRATEGY
* **Framework:** React 19.2 (latest) bundled via Vite. Chosen for its extremely fast HMR and optimized production rollups over Webpack.
* **Rendering:** Client-Side Rendering (CSR). Since the primary users are logged-in staff and booking portals where state changes rapidly by the millisecond (socket events), CSR avoids the heavy server roundtrips inherent in SSR architectures like Next.js, allowing WebSockets to maintain continuous UI state.

### 6.2 COMPONENT ARCHITECTURE
* **Structure:** Separated by functional boundaries. Root routing wrappers load independent `Pages` (`Customer.jsx`, `Admin.jsx`, `AdvancedAnalytics.jsx`). 
* **Modularity:** Heavy reliance on component isolation for `Recharts` and `framer-motion` modules to ensure chart re-renders don't trigger layout thrashing in parent tables.

### 6.3 STATE MANAGEMENT
* **Local vs Global:** Heavy reliance on React Context and localized Hooks for specific view states. 
* **Real-time State:** `socket.io-client` intercepts events (`slot-updated`, `booking-confirmed`) to dynamically map over the existing `slots` state array, bypassing the need for a heavy monolithic store like Redux while keeping the UI immediately consistent with server state.

### 6.4 ROUTING
* **Library:** `react-router-dom` (v7.x).
* **Strategy:** Flat routing structure with route guards for the Admin interface intercepting unauthenticated JWT attempts. 

### 6.5 PERFORMANCE OPTIMIZATION
* **Bundle Scaling:** TailwindCSS tree-shakes unused classes entirely. 
* **Reconciliation:** Using React concurrent features to ensure main-thread isn't blocked when rendering the massive `.csv` data loops requested off the `AdvancedAnalytics` page.

### 6.6 UI SYSTEM
* **Styling:** Utility-first via TailwindCSS (v3.4), avoiding CSS scoping issues. 
* **Animations:** `framer-motion` handles micro-interactions, smoothing out the transition when slots are manually locked by opposing users. 

### 6.7 ACCESSIBILITY
* Use of `lucide-react` for visually scalable SVGs, though structural ARIA labeling on dynamic slot buttons requires active enforcement to ensure screen readers announce "slot held" state shifts.

### 6.8 EDGE CASE HANDLING
* **Ghost Locks:** optimistically gracefully degrading UI handles scenarios where a user holds a slot and abruptly disconnects, awaiting the server's 5-minute cleanup CRON to unfreeze it.

### 6.9 TESTING
* Current setup utilizes linting (`eslint-plugin-react-hooks`). Needs `Vitest` + `Testing Library` to mock Socket connections.

### 6.10 LIMITATIONS & IMPROVEMENTS
* **Improvement:** Implement `@tanstack/react-query` to handle caching for stable API responses (like static inventory defaults) to conceptually separate server-state from local-state instead of manually appending socket events to raw `useEffect` states.

---

## 7. BACKEND ARCHITECTURE (SENIOR BACKEND ENGINEER)

### 7.1 ARCHITECTURE STYLE
* **Style:** Split Monolith. A single large Express gateway (`server.js`) handles all user orchestration, bypassing typical HTTP for heavy logic by making internal network calls to an independent Python ML Microservice.

### 7.2 API DESIGN
* **Structure:** REST endpoints mingled with WebSocket full-duplex channels. 
* **Idempotency:** The `/api/hold-slot` uses strict atomic operations (`findOneAndUpdate` with `status: 'available'`) ensuring idempotency against concurrent firing requests.

### 7.3 BUSINESS LOGIC
* **Background Jobs:** Utilizes `node-cron` to globally reset non-booked slots nightly at `23:00` and `setInterval` polling every 30 seconds to automatically reclaim `held` slots whose `holdExpiry` is `< Date.now()`.
* **Heuristics:** Employs a manually weighted mathematical fallback `calculateFallbackChurn` inside Node.js to guarantee continuous operation if the ML server is down.

### 7.4 AUTHENTICATION & AUTHORIZATION
* **Strategy:** Stateless JWTs (`jwt.sign`) securely transmitted. Passwords irreversibly scrambled using `bcryptjs` genSalts before Mongo insertion.

### 7.5 DATABASE INTERACTION
* **Driver:** Mongoose ORM.
* **Queries:** Heavy cross-collection processing is executed directly in mapped JS memory logic rather than via heavy Mongo `$group` aggregations due to local performance tuning priorities.

### 7.6 SCALABILITY STRATEGY
* **Issue:** WebSocket connections are stateful to a single Node instance.
* **Solution:** To horizontally scale (e.g., 5 Node servers behind an NGINX load balancer), `socket.io-redis-adapter` MUST be integrated.

### 7.7 PERFORMANCE OPTIMIZATION
* Exclusively calls `.lean()` on large read queries like Analytics (bypassing Mongoose hydration overhead), vastly reducing memory serialization limits.

### 7.8 ERROR HANDLING
* Wraps critical cross-service boundaries (Twilio SMS, Python ML fetch) in rigid `try/catch` blocks, preventing cascading service timeouts from permanently blocking the Node event loop.

### 7.9 TESTING
* API surface remains heavily manual via Postman. Supertest/Jest pipelines are required for CI assertion.

### 7.10 LIMITATIONS & IMPROVEMENTS
* **Monolith Size:** `server.js` sits at 763 lines. Needs strict Domain-Driven folder restructuring (Routes, Controllers, Services). Hardcoded secrets must migrate to secure parameter stores.

---

## 8. DATA LAYER & DATABASE (DATA ENGINEER)

### 8.1 DATA MODEL
* **Core:** Document-oriented NoSQL models via MongoDB Atlas.
* **Structure:** `Slot` acts as stateful temporal entities. `Booking` serves as transactional truth logs. `Churn` acts as an active, rolling metric-aggregator table.

### 8.2 SCHEMA DESIGN
* Soft schemas via Mongoose proxying rapid insertions. The `Churn` model denormalizes cleanly over 20+ ML-ready fields (like `total_visits`, `booking_source`), mutating dynamically per-commit rather than invoking heavy historical joins dynamically at runtime.

### 8.3 RELATIONSHIPS
* Document relations: `Booking` maintains a pseudo foreign-key `slotId` pointing statically to the physical `Slot` metadata.

### 8.4 INDEXING STRATEGY
* **Issue:** Currently lacks explicit explicit compound codes.
* **Requirement:** Fast string scans. Immediate compound indexing needed on `{ phone: 1, name: 1 }` in the Churn collection due to heavy repetitive `$regex` scans occurring constantly during booking lookups.

### 8.5 QUERY OPTIMIZATION
* **Bottlenecks:** The Analytics dashboard loop runs $O(N)$ row parsing across massive local `.csv` files via Node `fs.createReadStream`. 
* **Fix:** Historical CSV datasets must be immediately ingested into dedicated Native MongoDB Time-Series collections.

### 8.6 DATA PIPELINES
* **ETL Engine:** Fully event-driven ETL. When a booking confirms, the `/confirm-booking` route acts as a real-time data ingestion point parsing features directly back to `Churn` updates sequentially.

### 8.7 SCALABILITY
* Atlas clustering isolates compute. Read-heavy Analytics queries can be selectively routed seamlessly to secondary Replica Sets, leaving the master Node open for high-speed write locks on slot bookings.

### 8.8 DATA CONSISTENCY
* Currently relies on linear awaits. True ACID compliance demands wrapping `Booking.save()` and `Slot.updateOne()` firmly inside `mongoose.startSession()` transactional blocks for failure rollbacks.

### 8.9 LIMITATIONS & IMPROVEMENTS
* **Synthetic Overlap:** Heavy reliance on discrete datasets (`realistic_customer_dataset_8000.csv`) prevents realtime feature drift calculations. A proper active feature store (like Feast) is the next evolution.

---

## 9. ML/DL COMPONENT (IN-DEPTH ANALYSIS)

### 9.1 PROBLEM FORMULATION
* **Churn (Model A):** Formulated as Binary Classification (0: Retained, 1: Churn), avoiding mathematical instability seen in regression over right-censored data (e.g., predicting exact days left).
* **Demand (Model B):** Formulated as Multi-class Classification (`multi:softprob`) across 3 discrete buckets (Low, Medium, High). This directly answers business needs (e.g., "Schedule +2 staff") rather than dealing with volatile continuous regression curves.

### 9.2 DATASET ANALYSIS & PREPROCESSING
* **Source/Size:** Synthetic CRM dataset (`realistic_customer_dataset_8000.csv`) with 8,000 continuous temporal profiles.
* **Cleaning:** Filled missing numericals with rigid absolute `0.0`. Imputed null string vectors explicitly with `'Unknown'` to compel models to inherently evaluate missingness as a behavioral cohort rather than indiscriminately dropping rows.
* **Encoding:** 
  * *XGBoost:* Utilized standard `LabelEncoder` for string mapping into monotonic integers.
  * *CatBoost:* Skipped manual encoding entirely. CatBoost processes `cat_features` natively with Ordered Target Encoding, avoiding sparse dimensionality explosion typical of One-Hot Encoding.
* **Scaling:** Omitted feature scaling as gradient boosted tree ensembles are mathematically invariant to monotonic transformations, thereby saving sub-millisecond compute timing during inference.

### 9.3 MODEL SELECTION & FINAL DETAILS
* **Trials:** Logistic Regression (failed on interaction depth) → Random Forest (inflexible on sparse categoricals) → **XGBoost / CatBoost** (Final).
* **Final Choices:** 
  * *CatBoost (Churn):* Symmetric trees natively prevent overfitting on large cardinality string variables (e.g. cities).
  * *XGBoost (Demand):* Chosen specifically for raw computational stability on numerical inputs and robust rendering of `num_class=3` probability arrays.
* **Key Hyperparameters:**
  * Both model architectures were strictly clamped to `max_depth=6`. Shallow bounds actively limit variance overfitting and allow `learning_rate=0.1` to smoothly navigate feature spaces. `iterations=500` (CatBoost) and `n_estimators=200` (XGBoost) were empirically derived via early stopping criteria.

### 9.4 TRAINING SETUP & EVALUATION
* **Loss Functions:** 
  * *Churn:* `Logloss` (Binary Cross-Entropy), prioritizing exact fractional risk confidence (probabilistic calibration) instead of arbitrary 1/0 flagging.
  * *Demand:* `multi:softprob` to return discrete class probabilities.
* **Validation Strategy:** `Stratify=y` applied to 80/20 train-test splits keeping target ratios exact, protecting against natural "ghost/loyalty" class imbalances inherently present in CRM data.
* **Metrics:** Accuracy supplemented with F1-Score and precision-recall evaluations to delicately balance false negatives (missing a churning customer) against false positives (spamming a loyal client).

### 9.5 MLOPS, DEPLOYMENT & LIMITATIONS
* **Deployment:** Exposed synchronously via a Flask REST microservice (`app.py`), statically unpickling `.pkl` files exactly once at boot up within memory state, guaranteeing continuous `<150ms` internal network SLAs.
* **Limitations:** The models are statically compiled. Without an automated drift-detection monitor tracking feature entropy over time, the current models lack real-time online learning triggers.

---

## 10. DEVOPS & INFRASTRUCTURE (DEVOPS ENGINEER)

### 10.1 CI/CD PIPELINE
* Currently minimal. Future scaling mandates GitHub Actions integration to automatically lint React, execute server health check suites, and trigger automated builds.

### 10.2 CONTAINERIZATION
* Critical next phase: `docker-compose.yml` generation tying the Frontend (Nginx), Backend (Node), and Flask API (Python) securely. Allows hiding the ML inference port entirely from external internet exposure via isolated docker bridges.

### 10.3 DEPLOYMENT STRATEGY
* **Blue-Green Deployment:** Because slot constraints are temporally strict, dropping connections ruins active sessions holding slots. Blue-Green swaps ensure live traffic is never interrupted during upgrades.

### 10.4 CLOUD SETUP
* Target serverless execution topologies. AWS ECS (Fargate) isolates cluster management constraints, allowing precise RAM/CPU assignments explicitly separated between Node and Python workers.

### 10.5 SCALING
* **Strategy:** Segregated boundaries. The Python container receives aggressive CPU scaling quotas (XGBoost inferencing is purely compute-bound), whereas the Express Node proxy scales dynamically based purely on concurrent socket saturation headers.

### 10.6 MONITORING
* Standard `console.log` trace logs must be ingested into Datadog or NewRelic to identify distributed APM bottlenecks (e.g. tracking `/confirm-booking` execution vs API fetch to Twilio).

### 10.7 SECURITY
* **Secrets:** Hardcoded Mongo URIs, Twilio tokens, and JWT salting must be excised entirely into `.env` configurations supported by AWS Secrets Manager contexts.
* **Network:** Universal CORS allowances (`origin: "*"`) must be strictly narrowed down to the static frontend deployment host url.

### 10.8 FAILURE HANDLING
* Handled effectively internally. The fallback churn calculations act as an uncoupled circuit breaker preventing systemic failures if the Python port goes unreachable. 

### 10.9 COST OPTIMIZATION
* Heavy buffer memory usage results from dynamically piping local 8000 line CSV blocks directly inside Node. Transitioning these to S3 arrays and fetching via Presigned CloudFront URLs massively limits standard server compute overhead.

### 10.10 LIMITATIONS & IMPROVEMENTS
* **Improvement:** Adopt Infrastructure as Code (Terraform) to spin up the VPC, MongoDB peering rules, and load balancers predictably, eliminating local environment "it works on my machine" flaws entirely.

---

## 11. FINAL SUMMARY (INTERVIEW READY)
**AutoSalon** is a robust, full-stack platform tackling complex real-time scheduling and retention challenges within the beauty industry. Built natively on React 19, Node.js, and MongoDB, it leverages real-time WebSockets to bypass race-condition booking flaws entirely. Operating under a split monolith pattern, its deeply integrated Python microservice injects enterprise-grade churn algorithms (CatBoost) and predictive demand (XGBoost) seamlessly into the business orchestration path. Meticulously optimized for concurrent throughput, decoupled states, and graceful fallback handling, it presents a highly scalable foundation structured explicitly for robust expansion.
