# Hostinger Deployment

## Storage

This project is configured for free local uploads on Hostinger:

```env
UPLOAD_STORAGE=local
```

Uploaded files are stored in:

```text
backend/uploads
```

Do not delete this folder during deployments. Back up this folder together with the database.

## Build Frontend

From `frontend/`:

```bash
npm install
npm run build
```

Upload the contents of `frontend/dist` to Hostinger `public_html`.

Also upload the `backend` folder into `public_html/backend`.

The `.htaccess` file included in the frontend build routes:

- `/api/*` to `backend/public/index.php`
- `/uploads/*` to `backend/uploads/*`
- all other paths to React `index.html`

## Backend Setup

On Hostinger, update `backend/.env`:

```env
APP_CORS_ORIGIN=https://your-domain.com
DB_HOST=your_hostinger_db_host
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=use-a-long-random-secret
UPLOAD_STORAGE=local
```

Keep `backend/uploads` writable by PHP. Start with permission `755`; if uploads fail, try `775`.

## Database

Import:

```text
backend/database/schema.sql
```

Then log in with your configured admin account.
