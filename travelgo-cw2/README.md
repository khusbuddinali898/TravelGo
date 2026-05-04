# TravelGo CW2 Project
TravelGo is a travel media sharing web app.
## Structure
- backend: Node.js Express API with Azure Blob Storage and Cosmos DB
- frontend: HTML/CSS/JS web app

## Backend local run
cd backend
npm install
copy .env.example .env
npm start

## Frontend local run
Open frontend/index.html with VS Code Live Server.



## Technologies Used
- HTML, CSS, JavaScript
- Node.js / Express
- Azure App Service
- Azure Cosmos DB
- Azure Blob Storage

## Features
- Upload travel media
- Create posts
- View posts
- Edit posts
- Delete posts

## Azure resources needed
- Azure App Service for backend
- Azure Static Web Apps or Storage Static Website for frontend
- Azure Blob Storage container called media
- Azure Cosmos DB database TravelGoDB with container Media and partition key /userId
- Application Insights enabled for backend

## Live Demo
Frontend URL:
Backend URL: