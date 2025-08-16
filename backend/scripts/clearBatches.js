const db = require('../services/database.js');

const statuses = db.all('SELECT DISTINCT workflow_status, COUNT(*) as count FROM samples GROUP BY workflow_status');
statuses.forEach(status => {
  });

try {
  const result3 = db.run('UPDATE samples SET lab_batch_number = NULL WHERE lab_batch_number IS NOT NULL');
  } catch (error) {
  console.error('Error clearing lab_batch_number:', error.message);
}

try {
  const result2 = db.run(`UPDATE samples SET workflow_status = 'sample_collected'`);
  } catch (error) {
  console.error('Error updating workflow_status:', error.message);
}

const counts = db.getSampleCounts();
);

