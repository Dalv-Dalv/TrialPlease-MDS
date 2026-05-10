# 🛠️ Local Setup & Installation

To run TrialSim AI on your local machine, you will need **Node.js** and **Python 3.10+**.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/TrialPlease-MDS.git
cd TrialPlease-MDS
```

### 2. Start the Django Backend
The backend uses Django and Django REST Framework.

Before starting, create a `.env` file in the `Django_Backend` directory with the following variable for the AI to function:
```env
GEMINI_API_KEY="your_api_key_here"
```

Then, run the following commands:
```bash
cd Django_Backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and start the server
python manage.py migrate
python manage.py runserver
```

### 3. Start the React Frontend
Open a **new terminal window** and navigate to the frontend folder.
```bash
cd R3F_Frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend app will be available at `http://localhost:5173` and the backend will run at `http://localhost:8000`.
You can log in using the default test account (if configured):
- **Username:** `admin`
- **Password:** `password123`

---

## 📡 API Endpoints

The backend provides several endpoints for interacting with cases, generating new trials via AI, and querying the different lawyers and witnesses.

**Base URL:** `http://localhost:8000`

### Authentication
- **`POST /api/login/`**
  Returns an authentication token given credentials (username/password).

### Case Management (`/api/cases/`)
- **`GET /api/cases/`**
  Retrieves a list of all trial cases, ordered by newest first.
- **`POST /api/cases/`**
  Creates a new case manually.
- **`GET /api/cases/<id>/`**
  Retrieves the full details of a specific case, including witnesses and evidence.
- **`PUT` / `PATCH` / `DELETE /api/cases/<id>/`**
  Standard CRUD operations to modify or delete a specific case.

### AI Integration
- **`POST /api/cases/generate/`**
  Calls the Gemini AI to autonomously generate a completely new case (plot, characters, evidence, etc.), saves it to the database, and returns the full case object.

### Trial Actions
- **`POST /api/cases/<id>/lawyer_action/`**
  Asks a specific lawyer (prosecutor or defense) to take an action or provide an argument.
  **Payload:**
  - `lawyer_type` (string): `"prosecutor"` or `"defense"` (defaults to `"prosecutor"`)
  - `confidence_level` (string): e.g., `"normal"`
  - `transcript` (list): The existing dialogue transcript so far.
  
- **`POST /api/cases/<id>/witness_answer/`**
  Questions a specific witness about the case.
  **Payload:**
  - `witness_id` (integer): ID of the witness being questioned.
  - `question` (string): The question to ask the witness.
  - `transcript` (list): The context/transcript of the current trial session.

- **`POST /api/cases/<id>/debrief/`**
  Debriefs the user at the end of the trial, determining if their verdict was correct.
  **Payload:**
  - `verdict` (string): The user's given verdict.
  **Returns:**
  - The `absolute_truth` of the case.
  - The `correct_verdict`.
  - `verdict_correct` (boolean): Whether the user's verdict matched the correct one.
