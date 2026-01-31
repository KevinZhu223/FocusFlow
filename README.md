# FocusFlow - Smart Productivity Tracker

A smart productivity tracker that uses **LLM-powered Natural Language Processing** to log and analyze your daily activities. Simply describe what you did in plain English, and FocusFlow will parse it into structured data, categorize it, apply weighted scoring, and provide AI-powered coaching insights.

##  Features

### Phase 2 (Current)
- ** LLM Intelligence**: GPT-4o-mini powered activity parsing with context awareness
- ** JWT Authentication**: Full user registration, login, and protected routes
- ** Advanced Visualizations**:
  - **Productivity Radar**: Balance across Career, Health, Social, Leisure, Chores
  - **Activity Heatmap**: GitHub-style 365-day contribution graph
  - **Energy Battery**: Visual daily energy level indicator
  - **Coach's Insight**: AI-generated 2-sentence daily coaching
- ** Weighted Scoring**: `Score = BaseCategoryScore × DurationHours × FocusMultiplier`
- ** Focus Detection**: 1.2x multiplier for deep work sessions

### Core Features
- **Natural Language Input**: "Studied Python for 2 hours" → parsed automatically
- **Smart Categorization**: Context-aware (e.g., "Coding a game" = Leisure vs "Coding a project" = Career)
- **Category Breakdown**: Pie chart showing time distribution
- **Dark Mode UI**: Modern, responsive interface

##  Project Structure

```
FocusFlow/
├── backend/
│   ├── app.py              # Flask API with auth & insights routes
│   ├── auth.py             # JWT authentication blueprint
│   ├── models.py           # SQLAlchemy models (User, ActivityLog)
│   ├── nlp_parser.py       # OpenAI LLM integration & scoring
│   ├── reset_db.py         # Database migration script
│   └── requirements.txt    # Python dependencies
│
├── frontend/src/
│   ├── contexts/
│   │   └── AuthContext.jsx # Authentication state management
│   ├── pages/
│   │   ├── LoginPage.jsx   # Login UI
│   │   └── RegisterPage.jsx # Registration UI
│   ├── components/
│   │   ├── Dashboard.jsx   # Main dashboard with all visualizations
│   │   ├── ProductivityRadar.jsx  # Radar chart
│   │   ├── ActivityHeatmap.jsx    # 365-day heatmap
│   │   ├── EnergyBattery.jsx      # Battery indicator
│   │   └── CoachInsight.jsx       # AI coaching
│   ├── api.js              # API service with auth
│   └── App.jsx             # Router & protected routes
└── README.md
```

##  Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, React Router
- **Backend**: Python Flask, SQLAlchemy, PyJWT, bcrypt
- **AI**: OpenAI GPT-4o-mini
- **Database**: PostgreSQL

##  Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL 14+
- OpenAI API Key (for LLM features)

### 1. Database Setup

```sql
CREATE DATABASE focusflow;
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and OPENAI_API_KEY

# Reset database (if upgrading from Phase 1)
python reset_db.py

# Start server
python app.py
```

Backend runs at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/log_activity` | Log activity from text |
| GET | `/api/activities` | Get today's activities |
| GET | `/api/activities/heatmap` | Get 365-day heatmap data |
| DELETE | `/api/activities/:id` | Delete an activity |

### Dashboard & Insights
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Daily stats & breakdown |
| GET | `/api/insights/daily` | AI coach insight |
| GET | `/api/health` | Health check |

##  Productivity Scoring

| Category | Base Score | Example Activities |
|----------|------------|-------------------|
| Career | +10 | Coding, studying, meetings |
| Health | +8 | Gym, meditation, running |
| Social | +5 | Friends, family time |
| Chores | +4 | Cleaning, groceries |
| Leisure | -5 | Netflix, gaming |

**Weighted Formula**: `Score = BaseScore × DurationHours × Multiplier`
- **Focus Multiplier**: 1.2x for deep work sessions
- Duration capped at 4 hours to prevent extreme scores

##  Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/focusflow
JWT_SECRET=your-secure-secret-key
OPENAI_API_KEY=sk-your-openai-key
```

##  Testing the Setup

```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"test123"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Log activity (use token from login)
curl -X POST http://localhost:5000/api/log_activity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text": "Deep work coding session for 3 hours, really focused"}'
```

##  License

MIT License
