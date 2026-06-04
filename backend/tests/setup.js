/**
 * Jest Global Test Setup
 * Sets environment variables required for tests
 */

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_jest_32chars!!';
process.env.JWT_EXPIRE = '7d';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_jest_32chars!!';
process.env.JWT_REFRESH_EXPIRE = '30d';
process.env.MONGO_URI_TEST = 'mongodb://127.0.0.1:27017/saasapp_test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_PRICE_BASIC = 'price_basic_test';
process.env.STRIPE_PRICE_PRO = 'price_pro_test';
process.env.STRIPE_PRICE_ENTERPRISE = 'price_enterprise_test';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.FROM_EMAIL = 'noreply@test.com';
process.env.FROM_NAME = 'TestApp';
process.env.PORT = '5001';
