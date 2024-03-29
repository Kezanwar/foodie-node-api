# Foodie Node API - NodeJS / MongoDB Atlas / Redis

Foodies Node API serving as a backend for the Restaurant Dashboard and Customer Native App.

### Development Setup

Development points to MongoDB Atlas (staging db) and a local Redis Docker Image.

Install Node v18.15.0

Install Docker

Create an .env file in the root using this example

```
APP_ENV=example
PORT=example
JWT_SECRET=example
MONGO_URI=example
SENDGRID_API_KEY=example
BUCKET_NAME=example
BUCKET_REGION=example
S3_ACCESS_KEY=example
S3_SECRET_KEY=example
S3_BUCKET_BASE_URL=example
MAILCHIMP_API_KEY=example
MAILCHIMP_SERVER_PREFIX=example
RAPID_KEY=example
BASE_URL=example
MIXPANEL_TOKEN=example
GOOGLE_CLIENT_ID=example
GOOGLE_CLIENT_SECRET=example
GOOGLE_REGISTER_EMAIL_PW_SECRET=example
REDIS_PORT="http://localhost:6379/"
```

Install node_modules

```
npm install
```

Create Redis DB

```
bash cmd/make-redis.sh
```

Start Server and Redis

```
bash cmd/start-dev.sh
```
