# Wassel — Local server to persist users to Excel

This project contains a simple Express server that serves the frontend and saves user registrations to an Excel file `users.xlsx` in the same folder.

Quick start (Windows PowerShell):

1. Open PowerShell and change to the project folder:

```powershell
cd 'C:\Users\User\Downloads\Wassel'
```

2. Install dependencies (Node.js must be installed):

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

4. Open the app in your browser:

http://localhost:3000/

Notes:
- Registrations submitted from the web UI will be appended to `users.xlsx` in the same folder.
- If `users.xlsx` doesn't exist it will be created automatically.
- The server exposes a simple JSON API at `/api/users` (GET returns users, POST appends a user).
- Keep the server running while you use the app; saving can't be done from a static `file://` page due to browser security restrictions.

## Deploy to Netlify
This repo is prepared to deploy to Netlify as a static site with serverless functions.

- The frontend is the project root (publish directory) and will serve `index.html`.
- Netlify Functions are in `netlify/functions` (already included). These functions can use Airtable or Google Sheets as the backend depending on environment variables.

Required environment variables (choose one backend):
- Airtable backend:
	- `AIRTABLE_API_KEY`
	- `AIRTABLE_BASE_ID`
	- `AIRTABLE_TABLE_NAME` (optional, defaults to `Users`)

- Google Sheets backend:
	- `GOOGLE_SHEETS_CREDENTIALS` (JSON credentials as a single-line string)
	- `GOOGLE_SHEETS_ID` (spreadsheet ID)
	- `GOOGLE_SHEETS_RANGE` (optional, defaults to `Users`)

How to deploy:
1. Commit your code to a Git repository (GitHub, GitLab or Bitbucket).
2. In the Netlify UI, click "New site from Git" and connect your repository.
3. Set the build settings in Netlify (these are defaults used here):
	 - Build command: `npm run build`
	 - Publish directory: `.`
	 - Functions directory: `netlify/functions`
4. Add the required environment variables in the Netlify site settings (see above).
5. Trigger a deploy; the site will publish `index.html` and deploy the serverless functions.

Local testing (optional):
- Install Netlify CLI globally: `npm i -g netlify-cli` and run `netlify dev` from the project root.
- You can also use `npx netlify-cli dev` without installing globally.
