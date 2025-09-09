// Start Live Sample Cycler independently
const db = require('./services/database');
const liveSampleCycler = require('./services/liveSampleCycler');

async function startLiveCycler() {
  try {
    console.log('🔄 Initializing database...');
    await db.initialize();
    
    console.log('🚀 Starting Live Sample Cycler...');
    await liveSampleCycler.start();
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Stopping Live Sample Cycler...');
      await liveSampleCycler.stop();
      process.exit(0);
    });
    
    // Log status every 30 seconds
    setInterval(async () => {
      const status = await liveSampleCycler.getStatus();
      console.log('\n📊 Live Cycler Status:', {
        running: status.isRunning,
        totalSamples: status.totalSamples,
        processed: status.totalProcessed,
        resetAt: status.resetThreshold
      });
    }, 30000);
    
  } catch (error) {
    console.error('❌ Failed to start Live Sample Cycler:', error);
    process.exit(1);
  }
}

startLiveCycler();