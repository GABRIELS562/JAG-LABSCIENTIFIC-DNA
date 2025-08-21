#!/usr/bin/env node

/**
 * Simple load testing script for LIMS API endpoints
 * For DevOps demonstration purposes
 */

const http = require('http');

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3001';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT) || 10;
const TOTAL_REQUESTS = parseInt(process.env.TOTAL) || 100;

class LoadTester {
    constructor() {
        this.results = {
            success: 0,
            errors: 0,
            totalTime: 0,
            responses: []
        };
    }

    async makeRequest(path) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const url = new URL(path, BASE_URL);
            
            const req = http.get(url, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        this.results.success++;
                    } else {
                        this.results.errors++;
                    }
                    
                    this.results.responses.push({
                        statusCode: res.statusCode,
                        responseTime,
                        path
                    });
                    
                    resolve(responseTime);
                });
            });

            req.on('error', (err) => {
                this.results.errors++;
                console.error(`Request failed: ${err.message}`);
                resolve(0);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                this.results.errors++;
                resolve(0);
            });
        });
    }

    async runTest() {
        console.log(`Starting load test: ${TOTAL_REQUESTS} requests with ${CONCURRENT_REQUESTS} concurrent`);
        console.log(`Target: ${BASE_URL}`);
        console.log('-'.repeat(60));

        const endpoints = [
            '/health',
            '/api/samples/counts',
            '/api/workflow-stats',
            '/api/samples?limit=10',
            '/api/batches'
        ];

        const startTime = Date.now();
        const promises = [];

        for (let i = 0; i < TOTAL_REQUESTS; i++) {
            const endpoint = endpoints[i % endpoints.length];
            promises.push(this.makeRequest(endpoint));

            // Control concurrency
            if (promises.length >= CONCURRENT_REQUESTS) {
                await Promise.all(promises.splice(0, CONCURRENT_REQUESTS));
            }
        }

        // Wait for remaining requests
        if (promises.length > 0) {
            await Promise.all(promises);
        }

        const totalTime = Date.now() - startTime;
        this.generateReport(totalTime);
    }

    generateReport(totalTime) {
        const avgResponseTime = this.results.responses.reduce((sum, r) => sum + r.responseTime, 0) / this.results.responses.length;
        const successRate = (this.results.success / TOTAL_REQUESTS * 100).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log('LOAD TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Total Requests: ${TOTAL_REQUESTS}`);
        console.log(`Successful: ${this.results.success}`);
        console.log(`Errors: ${this.results.errors}`);
        console.log(`Success Rate: ${successRate}%`);
        console.log(`Total Time: ${totalTime}ms`);
        console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`Requests/Second: ${(TOTAL_REQUESTS / (totalTime / 1000)).toFixed(2)}`);
        
        // Response time distribution
        const times = this.results.responses.map(r => r.responseTime).sort((a, b) => a - b);
        const p50 = times[Math.floor(times.length * 0.5)];
        const p95 = times[Math.floor(times.length * 0.95)];
        const p99 = times[Math.floor(times.length * 0.99)];
        
        console.log('\nResponse Time Percentiles:');
        console.log(`50th percentile: ${p50}ms`);
        console.log(`95th percentile: ${p95}ms`);
        console.log(`99th percentile: ${p99}ms`);
        
        console.log('\nStatus Code Distribution:');
        const statusCounts = {};
        this.results.responses.forEach(r => {
            statusCounts[r.statusCode] = (statusCounts[r.statusCode] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([code, count]) => {
            console.log(`${code}: ${count} requests`);
        });
    }
}

async function main() {
    const tester = new LoadTester();
    await tester.runTest();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = LoadTester;