const bcrypt = require('bcryptjs');
const db = require('../services/database');

/**
 * Setup production user accounts with secure passwords
 * These passwords will be clearly documented for system access
 */
async function setupProductionUsers() {
  // Production user accounts with secure but known passwords
  const users = [
    {
      username: 'admin',
      email: 'admin@labdna.com',
      password: 'LabDNA2025!Admin',
      role: 'admin',
      full_name: 'System Administrator',
      active: true
    },
    {
      username: 'supervisor',
      email: 'supervisor@labdna.com', 
      password: 'LabDNA2025!Super',
      role: 'supervisor',
      full_name: 'Lab Supervisor',
      active: true
    },
    {
      username: 'analyst1',
      email: 'analyst1@labdna.com',
      password: 'LabDNA2025!Analyst',
      role: 'staff',
      full_name: 'Senior DNA Analyst',
      active: true
    },
    {
      username: 'technician1',
      email: 'tech1@labdna.com',
      password: 'LabDNA2025!Tech',
      role: 'staff', 
      full_name: 'Lab Technician',
      active: true
    },
    {
      username: 'client_portal',
      email: 'client@labdna.com',
      password: 'LabDNA2025!Client',
      role: 'client',
      full_name: 'Client Portal User',
      active: true
    }
  ];

  try {
    for (const user of users) {
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      
      // Check if user exists
      const existingUser = db.getUserByUsername(user.username);
      
      if (existingUser) {
        // Update existing user
        const updateStmt = db.db.prepare(`
          UPDATE users 
          SET email = ?, password_hash = ?, role = ?, full_name = ?, 
              active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE username = ?
        `);
        
        updateStmt.run(
          user.email,
          passwordHash,
          user.role,
          user.full_name,
          user.active ? 1 : 0,
          user.username
        );
      } else {
        // Create new user
        const insertStmt = db.db.prepare(`
          INSERT INTO users (
            username, email, password_hash, role, full_name, 
            active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        
        insertStmt.run(
          user.username,
          user.email,
          passwordHash,
          user.role,
          user.full_name,
          user.active ? 1 : 0
        );
      }
      
      - Password: ${user.password}`);
    }
    
    users.forEach(user => {
      } | ${user.role.padEnd(10)} | ${user.password}`);
    });
    
    return { success: true, userCount: users.length };
    
  } catch (error) {
    console.error('❌ Error setting up users:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  setupProductionUsers()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        console.error('❌ Setup failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupProductionUsers;