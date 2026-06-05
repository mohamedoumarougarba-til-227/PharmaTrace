const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'qrcode': path.resolve(__dirname, 'node_modules/qrcode/lib/core/qrcode.js'),
  'stream': path.resolve(__dirname, 'noop.js'),
  'zlib': path.resolve(__dirname, 'noop.js'),
  'crypto': path.resolve(__dirname, 'noop.js'),
  'buffer': path.resolve(__dirname, 'noop.js'),
  'http': path.resolve(__dirname, 'noop.js'),
  'https': path.resolve(__dirname, 'noop.js'),
  'net': path.resolve(__dirname, 'noop.js'),
  'tls': path.resolve(__dirname, 'noop.js'),
  'url': path.resolve(__dirname, 'noop.js'),
  'util': path.resolve(__dirname, 'noop.js'),
  'fs': path.resolve(__dirname, 'noop.js'),
  'path': path.resolve(__dirname, 'noop.js'),
};

module.exports = withNativeWind(config, { input: "./global.css" });
