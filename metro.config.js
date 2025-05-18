const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure config.resolver is an object before modifying it
config.resolver = config.resolver || {};

const existingExtraNodeModules = config.resolver.extraNodeModules || {};
const emptyModulePath = require.resolve('./core/stubs/emptyModule.js');

config.resolver.extraNodeModules = {
  ...existingExtraNodeModules, // Spread defaults first
  // Our polyfills/stubs, which will override if keys conflict:
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events/'),
  http: require.resolve('stream-http'),
  https: require.resolve('stream-http'),
  crypto: require.resolve('react-native-crypto'),
  url: require.resolve('react-native-url-polyfill'),
  zlib: require.resolve('pako'), 
  net: emptyModulePath,    // Stub out the net module
  tls: emptyModulePath,    // Stub out the tls module
  fs: emptyModulePath,     // Stub out the fs module
  assert: emptyModulePath, // Stub out the assert module
  // You might need to add other Node.js core modules here if you encounter similar errors
  // For example:
  // buffer: require.resolve('buffer/'),
  // vm: require.resolve('vm-browserify'),
  // path: require.resolve('path-browserify'),
  // os: require.resolve('os-browserify/browser'),
};

module.exports = config; 