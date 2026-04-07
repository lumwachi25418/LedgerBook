// seed.js
const sequelize = require('./db');
const Organization = require('./models/Organization');
const User = require('./models/User');
const Report = require('./models/Report');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Force recreate tables
    await sequelize.sync({ force: true });
    console.log('Tables created');

    // Create organization
    const org = await Organization.create({ name: 'My Church Org' });

    // Create user
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await User.create({
      email: 'admin@test.com',
      passwordHash,
      OrganizationId: org.id,
    });

    // Create a sample report
    await Report.create({
      name: 'Sample Report',
      date: new Date(),
      file: 'VGhpcyBpcyBhIHRlc3QgZmlsZSBkYXRh', // base64 placeholder
      OrganizationId: org.id,
      UserId: user.id,
    });

    console.log('Seed data inserted');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();