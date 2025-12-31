/**
 * Create test user for authentication testing
 */

import User from '#models/user';
import bcrypt from 'bcrypt';

async function createTestUser() {
  console.log('Creating test user...');

  const username = 'admin';
  const password = 'admin123';

  // Check if user already exists
  const existingUser = await User.query()
    .where('provider', 'local')
    .where('username', username)
    .first();

  if (existingUser) {
    console.log('Test user already exists, updating password...');
    const passwordHash = await bcrypt.hash(password, 10);
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
    console.log('✅ Test user updated');
    return;
  }

  // Create new user
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    uid: `local:${username}`,
    provider: 'local',
    username,
    email: 'admin@test.com',
    displayName: 'Administrator',
    passwordHash,
    roles: ['admin', 'viewer'],
    permissions: [
      'read:datasource',
      'write:datasource',
      'read:action',
      'write:action',
      'read:conversation',
      'write:conversation',
    ],
    isActive: true,
  });

  console.log('✅ Test user created:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Roles: ${user.roles.join(', ')}`);
  console.log(`   Permissions: ${user.permissions.length} permissions`);
}

createTestUser()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
