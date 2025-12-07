// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

// Set app root for Expo Router before requiring config
process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT || './app';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;

