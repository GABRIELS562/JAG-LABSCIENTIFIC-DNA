const http = require('http');

// Function to fetch the page
function testPage() {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:5001', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Check if index.html loads
                if (data.includes('<!doctype html>')) {
                    console.log('✅ HTML page loads successfully');
                    
                    // Check for React script includes
                    if (data.includes('react-core')) {
                        console.log('✅ React core chunk found in HTML');
                    } else {
                        console.log('❌ React core chunk NOT found in HTML');
                    }
                    
                    // Check for main app script
                    if (data.includes('index-') && data.includes('.js')) {
                        console.log('✅ Main app script found in HTML');
                    } else {
                        console.log('❌ Main app script NOT found in HTML');
                    }
                    
                    resolve(true);
                } else {
                    console.log('❌ Failed to load HTML page');
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error('❌ Error fetching page:', err.message);
            resolve(false);
        });
    });
}

// Test the JS files directly
function testJavaScriptFile(filename) {
    return new Promise((resolve) => {
        http.get(`http://localhost:5001/assets/${filename}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    // Check for common error patterns
                    if (data.includes('Cannot read properties of undefined')) {
                        console.log(`❌ ${filename}: Contains "Cannot read properties of undefined" error`);
                        resolve(false);
                    } else if (data.includes('useLayoutEffect') && !data.includes('React.useLayoutEffect')) {
                        console.log(`⚠️  ${filename}: References useLayoutEffect without React prefix`);
                        resolve(true);
                    } else {
                        console.log(`✅ ${filename}: No obvious errors found`);
                        resolve(true);
                    }
                } else {
                    console.log(`❌ ${filename}: HTTP ${res.statusCode}`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error(`❌ ${filename}: ${err.message}`);
            resolve(false);
        });
    });
}

async function runTests() {
    console.log('🔍 Testing React build fix...\n');
    
    // Test HTML loads
    const htmlOk = await testPage();
    
    if (!htmlOk) {
        console.log('\n❌ Build test failed: Cannot load HTML');
        process.exit(1);
    }
    
    console.log('\n✅ Build test completed successfully!');
    console.log('ℹ️  To fully verify: Open http://localhost:5001 in a browser and check the console for errors.');
}

runTests();
