# CA Portal

Full-stack Chartered Accountant website built with React + Vite on the frontend and PHP + MySQL on the backend.

## Features

- Public website with Home, About, Services, Blog, Contact, Login, and Register pages
- JWT-style token authentication with password hashing
- Client dashboard for documents, appointments, services, payments, notifications, and profile updates
- Admin panel for users, document review, services, appointments, and transactions
- MySQL tables for users, documents, services, appointments, payments, notifications, blogs, and contact messages
- Razorpay-ready payment flow with graceful fallback when keys are not configured

## Project Structure

```text
frontend/
  src/
  public/

backend/
  public/
  src/
  database/
  uploads/
  vendor/
```

## Environment Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Update the MySQL database credentials and JWT secret
3. Add Cloudinary credentials so uploaded files go to Cloudinary
4. Add Razorpay keys if you want live online checkout
5. Adjust the seeded admin credentials if you do not want the defaults

## Scripts

- `npm run dev` starts the PHP API and Vite client together
- `npm run client` starts the Vite frontend
- `npm run server` starts the PHP backend on `http://localhost:5000`
- `npm run build` creates the production frontend build
- `npm run lint` runs ESLint
- `npm start` starts the PHP backend on `http://localhost:5000`

## Notes

- User-uploaded files are stored in Cloudinary under the `ca-project/...` folder tree
- The backend validates PDF, JPG, and PNG uploads and limits them to 5 MB by default
- Default blog posts are seeded automatically on first run
- The API will create the configured MySQL schema automatically on first boot
