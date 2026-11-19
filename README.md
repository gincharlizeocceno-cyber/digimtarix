# DIGIMATRIX PALAWAN Print Upload Portal

A simple Node/Express portal with a customer artwork submission page and a password-protected admin dashboard.

## Features
- Customer print-order form and multi-file artwork uploads
- 10 files max per submission, 50 MB max per file
- Admin Basic Authentication
- Admin dashboard for viewing orders, downloading artwork, and changing status
- Files and orders stored locally on the server

## Requirements
Node.js 18+ recommended.

## Run locally

1. Open a terminal in this project directory.
2. Install dependencies: `npm install`
3. Set an admin password and start the site:

   **Windows PowerShell**
   ```powershell
   $env:ADMIN_USER="admin"
   $env:ADMIN_PASSWORD="CHANGE-THIS-TO-A-LONG-UNIQUE-PASSWORD"
   npm start
   ```
   **macOS/Linux**
   ```bash
   ADMIN_USER=admin ADMIN_PASSWORD='CHANGE-THIS-TO-A-LONG-UNIQUE-PASSWORD' npm start
   ```
4. Customer page: http://localhost:3000
5. Admin page: http://localhost:3000/admin (browser prompts for username/password)

## Deploy to the public internet
Deploy this Node app on a host that supports persistent disk storage. Set `ADMIN_USER` and `ADMIN_PASSWORD` as environment variables in the host's settings. Attach persistent storage for the `uploads/` and `data/` directories. Use HTTPS. Do not deploy with the sample password.


## Important
- Admin currently uses HTTP Basic Authentication; deploy behind HTTPS.
- Uploads and order data are stored on local disk. A host with ephemeral disk may delete them on restart or redeploy; use a persistent volume.
- Back up both `uploads/` and `data/orders.json` regularly.
- The portal does not send email/SMS notifications yet.
