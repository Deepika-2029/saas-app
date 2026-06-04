/**
 * Seed Script — creates test users for local development
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const users = [
  {
    name: 'Admin User',
    email: 'admin@saasapp.com',
    password: 'Password123!',
    role: 'admin',
    isEmailVerified: true,
    subscription: { plan: 'enterprise', status: 'active' },
  },
  {
    name: 'Jeenandra',
    email: 'jeenandra.2003@gmail.com',
    password: 'Password123!',
    role: 'user',
    isEmailVerified: true,
    subscription: { plan: 'pro', status: 'active' },
  },
  {
    name: 'Pro User',
    email: 'pro@saasapp.com',
    password: 'Password123!',
    role: 'user',
    isEmailVerified: true,
    subscription: { plan: 'pro', status: 'active' },
  },
  {
    name: 'Basic User',
    email: 'basic@saasapp.com',
    password: 'Password123!',
    role: 'user',
    isEmailVerified: true,
    subscription: { plan: 'basic', status: 'active' },
  },
  {
    name: 'Free User',
    email: 'free@saasapp.com',
    password: 'Password123!',
    role: 'user',
    isEmailVerified: false,
    subscription: { plan: 'free', status: 'active' },
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        // Update password & role in case they changed
        existing.password = userData.password;
        existing.role = userData.role;
        existing.isEmailVerified = userData.isEmailVerified;
        existing.subscription = userData.subscription;
        existing.loginAttempts = 0;
        existing.lockUntil = undefined;
        await existing.save();
        console.log(`🔄 Updated: ${userData.email}`);
      } else {
        await User.create(userData);
        console.log(`➕ Created: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n🎉 Seed complete! Test accounts:\n');
    console.log('┌─────────────────────────────────┬──────────────┬──────────────┐');
    console.log('│ Email                           │ Password     │ Role/Plan    │');
    console.log('├─────────────────────────────────┼──────────────┼──────────────┤');
    console.log('│ admin@saasapp.com               │ Password123! │ admin        │');
    console.log('│ jeenandra.2003@gmail.com        │ Password123! │ user/pro     │');
    console.log('│ pro@saasapp.com                 │ Password123! │ user/pro     │');
    console.log('│ basic@saasapp.com               │ Password123! │ user/basic   │');
    console.log('│ free@saasapp.com                │ Password123! │ user/free    │');
    console.log('└─────────────────────────────────┴──────────────┴──────────────┘');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
