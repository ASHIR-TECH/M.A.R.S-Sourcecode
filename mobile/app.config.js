const { expo } = require('./app.json');

// Small wrapper around app.json so the Android manifest can be environment-aware.
// Cleartext HTTP is only needed to reach the local dev relay on an emulator
// (http://10.0.2.2:3001). Release builds talk to Supabase and the relay tunnel
// over HTTPS, so keep it disabled unless the build explicitly opts in.
module.exports = () => ({
  ...expo,
  android: {
    ...expo.android,
    usesCleartextTraffic: process.env.CLEARTEXT_TRAFFIC === '1',
  },
});