/**
 * Firebase Cloud Functions - Main Entry Point
 * All payment processing functions for TechnicianMarketPlace
 */

// Load environment variables from .env file (for staging)
const path = require('path');
const fs = require('fs');

// Try to load .env.staging or .env from functions directory
const envStagingPath = path.join(__dirname, '../.env.staging');
const envPath = path.join(__dirname, '../.env');
const activeEnvPath = fs.existsSync(envStagingPath) ? envStagingPath : (fs.existsSync(envPath) ? envPath : null);
if (activeEnvPath) {
  require('dotenv').config({ path: activeEnvPath });
}

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Export all payment functions
const payment = require('./payment');
const payout = require('./payout');
const webhook = require('./webhook');

exports.processPayment = payment.processPayment;
exports.capturePayment = payment.capturePayment;
exports.verifyPayment = payment.verifyPayment;

exports.processRefund = payout.processRefund;
exports.createPayout = payout.createPayout;

// Webhook handlers
exports.razorpayWebhookHandler = webhook.razorpayWebhookHandler;

console.log('✓ Cloud Functions initialized successfully');
