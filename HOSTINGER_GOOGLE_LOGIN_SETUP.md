# Hostinger deployment and Google Sign-In

## 1. Upload the package

Extract the contents of `pkbusiness-hostinger-google-signin.zip` into `public_html`. The package keeps the site frontend at the document root and puts the PHP application under `public_html/app/backend`:

- `index.html`, `assets`, and `.htaccess` go directly in `public_html`.
- Keep the included backend at `public_html/app/backend`.

Do not delete `app/backend/uploads` during later deployments. It contains user uploads.

## 2. Install PHP dependencies

The package includes `app/backend/vendor`. If Hostinger SSH is available, run this in `public_html/app/backend` after upload:

```bash
composer install --no-dev --optimize-autoloader
```

## 3. Configure the backend environment

Copy `app/backend/.env.hostinger.example` to `app/backend/.env`, then replace every placeholder with your Hostinger database details and a long random JWT secret.

For this Hostinger layout, put the Firebase service-account JSON at:

```text
public_html/app/backend/credentials/firebase-service-account.json
```

The `app/backend/credentials/.htaccess` file denies HTTP access to that directory, and the site `.htaccess` also blocks requests to backend credential directories. Keep both access rules in place. Set `FIREBASE_SERVICE_ACCOUNT_PATH=credentials/firebase-service-account.json` in `public_html/app/backend/.env`; relative paths resolve from the backend directory. Never commit the service-account JSON to Git.

Set `FIREBASE_PROJECT_ID=pk-business-solution`. The backend reads `app/backend/.env` on every request bootstrap; Hostinger process-level environment variables take precedence when supplied.

For XAMPP, keep the credential outside the web root, for example at `C:/xampp/private/pk-business-solution-firebase-service-account.json`, and set `FIREBASE_SERVICE_ACCOUNT_PATH` in the ignored local `backend/.env` to that exact path. The service-account project ID must match `FIREBASE_PROJECT_ID`.

Set `APP_DEBUG=false` in production.

## 4. Update the database

For the existing `u147697182_pkbuiness` database export, import the files from `public_html/database` in this exact order in Hostinger phpMyAdmin, selecting the same database for both imports:

1. Your old backup: `u147697182_pkbuiness (1).sql`
2. `database/hostinger-full-upgrade-from-old-export.sql`

The second file preserves the imported users, documents, services, and other existing data. It adds the tables and fields required by the current website, including Google Sign-In support.

For a brand-new empty database, import `app/backend/database/schema.sql` instead. Use `database/hostinger-google-login-update.sql` only when the current schema is already installed and only Google Sign-In needs to be added.

## 5. Firebase console checks

Firebase Authentication → Settings → Authorized domains must include:

- `pkbusinesssolution.in`
- `www.pkbusinesssolution.in`

In Firebase Authentication → Sign-in method, ensure Google is enabled and the OAuth support email is selected.

## 6. Permissions and test

Set `app/backend/uploads` to `755` (or `775` only if PHP cannot upload files). Visit `/login`, select Google login, and confirm that a new Google user is sent to Profile to add a phone number.
