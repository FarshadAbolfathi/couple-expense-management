
# Expense Manager

This project is a monthly expense management application for couples, allowing each spouse to enter expenses separately or jointly by category. It features expense charts based on monthly budgets for better cost management, reporting through charts, search with autocomplete, a fully responsive design, and other features that enhance the user experience.

## Features
- User login and registration
- Expense and budget management
- CRUD users
- Advanced search and filter
- Support for Persian language, you can add another language

## Installation and Running

1. Install dependencies:
```bash
cd frontend
npm install
cd ../backend
npm install
```

2. Run the project:
- To run the frontend:
```bash
cd frontend
npm run dev
```
- To run the backend:
```bash
cd backend
node server.js OR npm start
```

## Important Notes
- Node.js and npm must be installed on your system to use this project.
- The SQLite database file is located in the backend folder.

**Note:** To have admin access, replace the email `farshad.code@gmail.com` with your own email in the backend configuration. This will allow you to see the admin panel.

## Project Structure
- frontend/: Frontend code (React)
- backend/: Backend code (Node.js)

## Technologies Used
- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js, SQLite
- Other: PostCSS, npm



