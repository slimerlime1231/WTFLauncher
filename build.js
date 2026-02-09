const { execSync } = require('child_process');

process.env.NODE_OPTIONS = '--no-warnings --no-deprecation';




console.log('Starting build with NODE_OPTIONS:', process.env.NODE_OPTIONS);
try {
    execSync('npx electron-builder --config electron-builder.json', { 
        stdio: 'inherit', 
        shell: true 
    });
} catch (error) {
    console.error('Build failed');
    process.exit(1);
}
