#!/usr/bin/env node

// Test script for PaternityTestForm submission
// Get next available lab numbers
async function getNextLabNumbers() {
  const response = await fetch('http://localhost:3001/api/get-last-lab-number');
  const data = await response.json();
  
  let baseNumber = 429;
  if (data.success && data.data) {
    const parts = data.data.split('_');
    if (parts.length === 2) {
      baseNumber = parseInt(parts[1], 10) + 1;
    }
  }
  
  return {
    child: `25_${baseNumber.toString().padStart(3, '0')}`,
    father: `25_${(baseNumber + 1).toString().padStart(3, '0')}`,
    mother: `25_${(baseNumber + 2).toString().padStart(3, '0')}`
  };
}

async function getTestData() {
  const labNumbers = await getNextLabNumbers();
  
  return {
    childrenRows: [
      {
        labNo: labNumbers.child,
        name: "Test",
        surname: "Child",
      dateOfBirth: "2020-01-15",
      collectionDate: "2024-08-07",
      submissionDate: "2024-08-07",
      emailContact: "test@example.com",
      phoneContact: "0123456789",
      addressArea: "Test Address",
      comments: "Test submission",
      testPurpose: "peace_of_mind",
      sampleType: "buccal_swab",
      authorizedCollector: "Test Collector"
    }
  ],
    fatherRow: {
      labNo: labNumbers.father,
      name: "Test",
      surname: "Father",
      dateOfBirth: "1985-05-20",
      collectionDate: "2024-08-07"
    },
    motherRow: null, // Test without mother
    clientType: "paternity",
    signatures: null,
    witness: null,
    legalDeclarations: null,
    consentType: "paternity",
    numberOfChildren: 1
  };
}

async function testSubmission() {
  try {
    const testData = await getTestData();
    );
    
    // Check samples before submission
    const beforeResponse = await fetch('http://localhost:3001/api/samples/counts');
    const beforeCounts = await beforeResponse.json();
    const response = await fetch('http://localhost:3001/api/submit-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const data = await response.json();
    );

    if (data.success) {
      // Check samples after submission
      const afterResponse = await fetch('http://localhost:3001/api/samples/counts');
      const afterCounts = await afterResponse.json();
      // List the created samples
      data.data.samples.forEach((sample, index) => {
        `);
      });
    } else {
      }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSubmission();