# 🛠️ Local Setup & Installation

To run TrialSim AI on your local machine, you will need **Node.js** and **Python 3.10+**.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/TrialPlease-MDS.git
cd TrialPlease-MDS
```

### 2. Start the Django Backend
The backend uses Django and Django REST Framework.
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

The app will be available at `http://localhost:5173`. You can log in using the default test account:
- **Username:** `admin`
- **Password:** `password123`
