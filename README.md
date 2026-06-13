# ColdDigger

ColdDigger is a full-stack web application built with React and Django. It automates cold outreach by reading your PDF resume and a CSV contact list. The system uses Gemini AI to write fully personalized emails and the Gmail API to send them directly to your contacts.

**Live Demo:** [https://cold-digger.vercel.app](https://cold-digger.vercel.app)

## Features

* Upload PDF resumes, extra attachments and CSV contact lists.
* Generate custom emails based on recipient job title and company context.
* Review and edit email drafts before sending.
* Connect your Google account via OAuth2 to send emails from your own address.
* Track background email sending progress in real time.

## Tech Stack

[![Tech Stack](https://skillicons.dev/icons?i=react,django,python,postgres,vite)](https://skillicons.dev)

* **Frontend:** React, React Router and plain CSS
* **Backend:** Django, Python and PostgreSQL
* **External APIs:** Google Gemini AI and Gmail API
* **Other Tools:** pdfplumber for PDF text extraction
* **Deployment:** Vercel (Frontend) and Render (Backend & Database)

## Prerequisites

* Python 3.10+
* Node.js 18+
* PostgreSQL
* Google Cloud Console account (for Gmail API credentials)
* Google Gemini API key

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```text
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=your_postgres_database_url
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
SMTP_EMAIL=your_smtp_email
SMTP_PASSWORD=your_smtp_password
```

## Local Setup

First, clone the repository to your local machine:
```bash
git clone <your-repository-url>
cd ColdDigger
```

### Backend
1. Navigate to the `backend` directory.
2. Create a virtual environment and activate it.
3. Install the required packages: `pip install -r requirements.txt`
4. Apply the database migrations: `python manage.py migrate`
5. Start the development server: `python manage.py runserver`

### Frontend
1. Navigate to the `frontend` directory.
2. Install the dependencies: `npm install`
3. Start the development server: `npm run dev`