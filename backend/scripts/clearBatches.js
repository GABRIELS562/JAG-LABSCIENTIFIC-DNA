const db = require('../services/database.js');

console.log('🔍 Checking current workflow_status values...');
const statuses = db.all('SELECT DISTINCT workflow_status, COUNT(*) as count FROM samples GROUP BY workflow_status');
statuses.forEach(status => {
  console.log(`- ${status.workflow_status || 'NULL'}: ${status.count} samples`);
});

console.log('\nClearing lab_batch_number...');
try {
  const result3 = db.run('UPDATE samples SET lab_batch_number = NULL WHERE lab_batch_number IS NOT NULL');
  console.log('Cleared lab_batch_number for', result3.changes, 'samples');
} catch (error) {
  console.error('Error clearing lab_batch_number:', error.message);
}

console.log('\nUpdating workflow_status to sample_collected...');
try {
  const result2 = db.run(`UPDATE samples SET workflow_status = 'sample_collected'`);
  console.log('Updated workflow_status for', result2.changes, 'samples');
} catch (error) {
  console.error('Error updating workflow_status:', error.message);
}

console.log('\n=== FINAL SAMPLE COUNTS ===');
const counts = db.getSampleCounts();
console.log('Sample counts:', JSON.stringify(counts, null, 2));

console.log('\n✅ All batches cleared and samples reset to pending state');