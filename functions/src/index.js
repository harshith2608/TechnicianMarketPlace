/**
 * Firebase Cloud Functions - Main Entry Point
 * All payment processing functions for TechnicianMarketPlace
 */

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
