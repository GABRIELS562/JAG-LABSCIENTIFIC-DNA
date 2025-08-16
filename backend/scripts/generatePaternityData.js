const db = require('../services/database');

// Sample names for variety
const childNames = [
  'Jose', 'Maria', 'Juan', 'Ana', 'Carlos', 'Elena', 'Pedro', 'Sofia', 'Diego', 'Carmen',
  'Miguel', 'Isabel', 'Roberto', 'Patricia', 'Fernando', 'Rosa', 'Manuel', 'Lucia', 'Antonio', 'Teresa',
  'Francisco', 'Dolores', 'Javier', 'Pilar', 'Rafael', 'Concepcion', 'Angel', 'Josefa', 'Alejandro', 'Francisca',
  'Daniel', 'Antonia', 'Adrian', 'Mercedes', 'Gonzalo', 'Rosario', 'Pablo', 'Angeles', 'Alvaro', 'Esperanza',
  'Sergio', 'Encarna', 'Marcos', 'Milagros', 'Ruben', 'Purificacion', 'Oscar', 'Remedios', 'Victor', 'Montserrat'
];

const fatherNames = [
  'Rodriguez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz',
  'Flores', 'Gomez', 'Morales', 'Vazquez', 'Jimenez', 'Castillo', 'Romero', 'Alvarez', 'Torres', 'Ruiz',
  'Moreno', 'Mendoza', 'Ortiz', 'Aguilar', 'Silva', 'Guerrero', 'Medina', 'Castro', 'Vargas', 'Ramos',
  'Delgado', 'Herrera', 'Reyes', 'Contreras', 'Gutierrez', 'Sandoval', 'Dominguez', 'Vega', 'Campos', 'Cervantes',
  'Navarro', 'Espinoza', 'Calderon', 'Soto', 'Maldonado', 'Salazar', 'Pacheco', 'Estrada', 'Figueroa', 'Luna'
];

const motherNames = [
  'Fernandez', 'Diaz', 'Morales', 'Suarez', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marin',
  'Sanz', 'Iglesias', 'Nuñez', 'Medina', 'Garrido', 'Cortes', 'Castillo', 'Santos', 'Lozano', 'Guerrero',
  'Cano', 'Prieto', 'Mendez', 'Calvo', 'Gallego', 'Vidal', 'Leon', 'Herrera', 'Marquez', 'Peña',
  'Moreno', 'Carmona', 'Jimenez', 'Ferrer', 'Pascual', 'Santana', 'Ramos', 'Escudero', 'Dominguez', 'Suarez',
  'Reyes', 'Cabrera', 'Caballero', 'Nieto', 'Aguilar', 'Gallardo', 'Rojas', 'Vargas', 'Castañeda', 'Ibañez'
];

function generatePaternityData() {
  try {
    // Clear existing samples
    db.clearAllSamples();
    
    let sampleCounter = 1;
    let caseCounter = 1;
    
    // Generate ~83 paternity cases (each with 3 samples = 249 samples, plus 1 more = 250)
    for (let i = 0; i < 83; i++) {
      const caseNumber = `25_${caseCounter.toString().padStart(3, '0')}`;
      
      // Generate random names for this family
      const childFirstName = childNames[Math.floor(Math.random() * childNames.length)];
      const childGender = Math.random() > 0.5 ? 'M' : 'F';
      const fatherSurname = fatherNames[Math.floor(Math.random() * fatherNames.length)];
      const motherSurname = motherNames[Math.floor(Math.random() * motherNames.length)];
      
      // Sample 1: Child
      const childSampleNumber = sampleCounter.toString().padStart(3, '0');
      const childLabNumber = `25_${childSampleNumber}`;
      const fatherSampleNumber = (sampleCounter + 1).toString().padStart(3, '0');
      const fatherLabNumber = `25_${fatherSampleNumber}`;
      
      const childSample = {
        lab_number: childLabNumber,
        case_number: caseNumber,
        name: childFirstName,
        surname: fatherSurname, // Child takes father's surname
        gender: childGender,
        age: Math.floor(Math.random() * 17) + 1, // 1-17 years old
        relation: `child(${fatherLabNumber})${childGender}`,
        collection_date: new Date(2025, 0, Math.floor(Math.random() * 30) + 1).toISOString(),
        status: 'active',
        workflow_status: 'sample_collected',
        sample_type: 'blood',
        notes: `Child of case ${caseNumber}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Sample 2: Alleged Father
      const fatherSample = {
        lab_number: fatherLabNumber,
        case_number: caseNumber,
        name: childFirstName, // Same first name as child for connection
        surname: `${fatherSurname} dad`,
        gender: 'M',
        age: Math.floor(Math.random() * 25) + 25, // 25-49 years old
        relation: 'alleged_father',
        collection_date: new Date(2025, 0, Math.floor(Math.random() * 30) + 1).toISOString(),
        status: 'active',
        workflow_status: 'sample_collected',
        sample_type: 'blood',
        notes: `Alleged father of case ${caseNumber}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Sample 3: Mother
      const motherSampleNumber = (sampleCounter + 2).toString().padStart(3, '0');
      const motherLabNumber = `25_${motherSampleNumber}`;
      
      const motherSample = {
        lab_number: motherLabNumber,
        case_number: caseNumber,
        name: childFirstName, // Same first name as child for connection
        surname: `${motherSurname} mother`,
        gender: 'F',
        age: Math.floor(Math.random() * 25) + 20, // 20-44 years old
        relation: 'mother',
        collection_date: new Date(2025, 0, Math.floor(Math.random() * 30) + 1).toISOString(),
        status: 'active',
        workflow_status: 'sample_collected',
        sample_type: 'blood',
        notes: `Mother of case ${caseNumber}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert samples into database
      try {
        db.createSample(childSample);
        db.createSample(fatherSample);
        db.createSample(motherSample);
      } catch (error) {
        console.error(`Error creating samples for case ${caseNumber}:`, error);
        throw error;
      }
      
      , ${fatherLabNumber} (father), ${motherLabNumber} (mother)`);
      
      sampleCounter += 3;
      caseCounter++;
    }
    
    // Add one more sample to reach exactly 250
    const finalCaseNumber = `25_${caseCounter.toString().padStart(3, '0')}`;
    const finalSampleNumber = sampleCounter.toString().padStart(3, '0');
    const finalLabNumber = `25_${finalSampleNumber}`;
    
    const finalSample = {
      lab_number: finalLabNumber,
      case_number: finalCaseNumber,
      name: 'Final',
      surname: 'Sample',
      gender: 'M',
      age: 25,
      relation: 'child(25_251)M',
      collection_date: new Date(2025, 0, 31).toISOString(),
      status: 'active',
      workflow_status: 'sample_collected',
      sample_type: 'blood',
      notes: 'Final sample to reach 250 total',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.createSample(finalSample);
    // Get final count
    const totalSamples = db.getSampleCount();
    // Show some sample data
    const samples = db.getAllSamples().slice(0, 9); // Show first 9 samples (3 cases)
    samples.forEach(sample => {
      });
    
  } catch (error) {
    console.error('❌ Error generating paternity data:', error);
    throw error;
  }
}

// Run the data generation
if (require.main === module) {
  generatePaternityData();
}

module.exports = generatePaternityData;