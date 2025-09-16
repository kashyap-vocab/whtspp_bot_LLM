const loadBalancer = require('./utils/apiLoadBalancer');

class APIUsageMonitor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) {
      console.log('📊 Monitor already running');
      return;
    }

    this.isRunning = true;
    console.log('📊 Starting API Usage Monitor...');
    
    // Log status every 30 seconds
    this.intervalId = setInterval(() => {
      this.logStatus();
    }, 30000);

    // Initial status
    this.logStatus();
  }

  stop() {
    if (!this.isRunning) {
      console.log('📊 Monitor not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('📊 API Usage Monitor stopped');
  }

  logStatus() {
    const status = loadBalancer.getStatus();
    const now = new Date().toLocaleTimeString();
    
    console.log(`\n📊 API Status [${now}]:`);
    console.log(`   Requests this minute: ${status.requestsThisMinute}/${loadBalancer.maxRequestsPerMinute}`);
    console.log(`   Requests today: ${status.requestsToday}/${loadBalancer.maxRequestsPerDay}`);
    console.log(`   Queue length: ${status.queueLength}`);
    console.log(`   Processing: ${status.isProcessing ? 'Yes' : 'No'}`);
    console.log(`   Can make request: ${status.canMakeRequest ? 'Yes' : 'No'}`);
    
    if (status.timeUntilReset > 0) {
      console.log(`   Time until reset: ${Math.ceil(status.timeUntilReset / 1000)}s`);
    }
    
    // Warning if approaching limits
    if (status.requestsThisMinute >= loadBalancer.maxRequestsPerMinute * 0.8) {
      console.log('⚠️  WARNING: Approaching minute limit!');
    }
    
    if (status.requestsToday >= loadBalancer.maxRequestsPerDay * 0.8) {
      console.log('⚠️  WARNING: Approaching daily limit!');
    }
  }

  getDetailedStatus() {
    const status = loadBalancer.getStatus();
    const now = new Date();
    
    return {
      timestamp: now.toISOString(),
      requestsThisMinute: status.requestsThisMinute,
      requestsToday: status.requestsToday,
      queueLength: status.queueLength,
      isProcessing: status.isProcessing,
      canMakeRequest: status.canMakeRequest,
      timeUntilReset: status.timeUntilReset,
      limits: {
        maxPerMinute: loadBalancer.maxRequestsPerMinute,
        maxPerDay: loadBalancer.maxRequestsPerDay
      },
      usage: {
        minuteUsage: (status.requestsThisMinute / loadBalancer.maxRequestsPerMinute * 100).toFixed(1) + '%',
        dailyUsage: (status.requestsToday / loadBalancer.maxRequestsPerDay * 100).toFixed(1) + '%'
      }
    };
  }
}

// Create singleton instance
const monitor = new APIUsageMonitor();

// Export for use in other files
module.exports = monitor;

// If run directly, start monitoring
if (require.main === module) {
  console.log('🚀 Starting API Usage Monitor...');
  console.log('Press Ctrl+C to stop');
  
  monitor.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down monitor...');
    monitor.stop();
    process.exit(0);
  });
}
