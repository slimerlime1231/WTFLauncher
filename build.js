const { execSync } = require('child_process');

// Suppress warnings including DEP0190. Using both flags to be sure.
process.env.NODE_OPTIONS = '--no-warnings --no-deprecation';

// Enable debug logging to see why it fails
// process.env.DEBUG = 'electron-builder'; // Commented out to avoid overwhelming output first, uncomment if needed. 
// Actually, let's enable it but just for the error context. 
// No, let's keep it simple first. The goal is suppression.

console.log('Starting build with NODE_OPTIONS:', process.env.NODE_OPTIONS);

try {
    // Run electron-builder using npx to ensure it's found
    execSync('npx electron-builder --config electron-builder.json', { 
        stdio: 'inherit', 
        shell: true 
    });
} catch (error) {
    console.error('Build failed');
    process.exit(1);
}
