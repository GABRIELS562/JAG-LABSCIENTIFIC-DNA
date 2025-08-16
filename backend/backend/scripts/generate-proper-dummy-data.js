const Database = require('better-sqlite3');
const path = require('path');

// Database setup - use the correct backend database path
const dbPath = '/Users/user/LABSCIENTIFIC-LIMS/backend/database/ashley_lims.db';
const db = new Database(dbPath);

// Sample first names and surnames for variety
const firstNames = {
  male: ['John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth'],
  female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle'],
  child: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander']
};

const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

// Generate random date within last year
function randomDate() {
  const start = new Date(2024, 0, 1);
  const end = new Date(2025, 7, 6);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random birth date
function randomBirthDate(minAge, maxAge) {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * (maxAge - minAge + 1)) - minAge;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// Generate random phone number
function randomPhone() {
  const prefix = '07';
  const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + number;
}

// Generate random ID number (South African format)
function randomIdNumber(birthDate) {
  const datePart = birthDate.replace(/-/g, '').slice(2); // YYMMDD
  const genderDigit = Math.floor(Math.random() * 10);
  const citizenDigit = Math.random() < 0.9 ? '0' : '1'; // 90% citizens
  const raceDigit = '8'; // Not used anymore but still in format
  const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return datePart + genderDigit + citizenDigit + raceDigit + randomDigits;
}

function clearExistingData() {
  // Clear samples and test_cases
  db.prepare('DELETE FROM samples').run();
  db.prepare('DELETE FROM test_cases').run();
  
  }

function generateDummyData() {
  let currentLabNumber = 1;
  let currentKit = 71; // Starting at BN-0071
  
  // Generate data for approximately 30-35 kits to reach 100 samples
  while (currentLabNumber <= 100) {
    const kitNumber = `BN-${currentKit.toString().padStart(4, '0')}`;
    
    // 70% chance of having mother, 30% chance of father and child only
    const hasMother = Math.random() < 0.7;
    const familySurname = surnames[Math.floor(Math.random() * surnames.length)];
    
    // Generate family dates
    const collectionDate = randomDate();
    const submissionDate = collectionDate;
    
    // Create test case
    const testCase = {
      case_number: kitNumber,
      ref_kit_number: kitNumber,
      client_type: 'paternity',
      test_purpose: 'peace_of_mind',
      has_signatures: Math.random() < 0.8 ? 'YES' : 'NO',
      has_witness: 'NO'
    };
    
    const testCaseStmt = db.prepare(`
      INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type, test_purpose, has_signatures, has_witness, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const testCaseResult = testCaseStmt.run(
      testCase.case_number,
      testCase.ref_kit_number,
      collectionDate.toISOString().split('T')[0], // submission_date
      testCase.client_type,
      testCase.test_purpose,
      testCase.has_signatures,
      testCase.has_witness
    );
    
    const caseId = testCaseResult.lastInsertRowid;
    
    // Child (always present)
    const childLabNumber = `25_${currentLabNumber.toString().padStart(3, '0')}(25_${(currentLabNumber + 1).toString().padStart(3, '0')})M`;
    const childName = firstNames.child[Math.floor(Math.random() * firstNames.child.length)];
    const childBirthDate = randomBirthDate(1, 17);
    
    createSample({
      case_id: caseId,
      lab_number: childLabNumber,
      name: childName,
      surname: familySurname,
      relation: 'Child',
      date_of_birth: childBirthDate,
      phone_number: randomPhone(),
      id_number: randomIdNumber(childBirthDate),
      id_type: 'nationalId',
      collection_date: collectionDate.toISOString().split('T')[0],
      submission_date: submissionDate.toISOString().split('T')[0],
      sample_type: 'saliva',
      case_number: kitNumber,
      place_of_birth: 'South Africa',
      nationality: 'South Africa'
    });
    
    currentLabNumber++;
    
    // Father (always present)
    const fatherLabNumber = `25_${currentLabNumber.toString().padStart(3, '0')}`;
    const fatherName = firstNames.male[Math.floor(Math.random() * firstNames.male.length)];
    const fatherBirthDate = randomBirthDate(25, 55);
    
    createSample({
      case_id: caseId,
      lab_number: fatherLabNumber,
      name: fatherName,
      surname: familySurname,
      relation: 'Father',
      date_of_birth: fatherBirthDate,
      phone_number: randomPhone(),
      id_number: randomIdNumber(fatherBirthDate),
      id_type: 'nationalId',
      collection_date: collectionDate.toISOString().split('T')[0],
      submission_date: submissionDate.toISOString().split('T')[0],
      sample_type: 'saliva',
      case_number: kitNumber,
      place_of_birth: 'South Africa',
      nationality: 'South Africa'
    });
    
    currentLabNumber++;
    
    // Mother (optional)
    if (hasMother && currentLabNumber <= 100) {
      const motherLabNumber = `25_${currentLabNumber.toString().padStart(3, '0')}`;
      const motherName = firstNames.female[Math.floor(Math.random() * firstNames.female.length)];
      const motherBirthDate = randomBirthDate(22, 50);
      
      createSample({
        case_id: caseId,
        lab_number: motherLabNumber,
        name: motherName,
        surname: familySurname,
        relation: 'Mother',
        date_of_birth: motherBirthDate,
        phone_number: randomPhone(),
        id_number: randomIdNumber(motherBirthDate),
        id_type: 'nationalId',
        collection_date: collectionDate.toISOString().split('T')[0],
        submission_date: submissionDate.toISOString().split('T')[0],
        sample_type: 'saliva',
        case_number: kitNumber,
        place_of_birth: 'South Africa',
        nationality: 'South Africa'
      });
      
      currentLabNumber++;
    }
    
    currentKit++;
    
    }
  
  }

function createSample(sampleData) {
  const stmt = db.prepare(`
    INSERT INTO samples (
      case_id, lab_number, name, surname, relation, status, phone_number,
      date_of_birth, place_of_birth, nationality, address, email, 
      id_number, id_type, collection_date, submission_date, sample_type,
      case_number, workflow_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  return stmt.run(
    sampleData.case_id,
    sampleData.lab_number,
    sampleData.name,
    sampleData.surname,
    sampleData.relation,
    'pending',
    sampleData.phone_number,
    sampleData.date_of_birth,
    sampleData.place_of_birth || 'South Africa',
    sampleData.nationality || 'South Africa',
    sampleData.address || '',
    sampleData.email || '',
    sampleData.id_number,
    sampleData.id_type,
    sampleData.collection_date,
    sampleData.submission_date,
    sampleData.sample_type,
    sampleData.case_number,
    'sample_collected'
  );
}

// Main execution
try {
  clearExistingData();
  generateDummyData();
  
  // Verify data
  const sampleCount = db.prepare('SELECT COUNT(*) as count FROM samples').get();
  const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
  
  .padStart(3, '0')}`);
  
  // Show some sample data
  const samples = db.prepare('SELECT lab_number, name, surname, relation, case_number FROM samples ORDER BY id LIMIT 10').all();
  samples.forEach(sample => {
    - ${sample.case_number}`);
  });
  
  } catch (error) {
  console.error('❌ Error generating dummy data:', error);
} finally {
  db.close();
}