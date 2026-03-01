import prisma from '../src/lib/prisma.js';

async function verifySchema() {
  console.log('🔍 Verifying Database Schema and Relationships\n');
  
  // Check User count
  const userCount = await prisma.user.count();
  console.log('✅ Users in database:', userCount);
  
  // Check Delegation count
  const delegationCount = await prisma.delegation.count();
  console.log('✅ Delegations in database:', delegationCount);
  
  // Get a user with delegation
  const userWithDelegation = await prisma.user.findFirst({
    where: {
      starknetAddr: { not: null }
    },
    include: {
      delegation: true
    }
  });
  
  if (userWithDelegation) {
    console.log('\n📊 Sample User with Delegation:');
    console.log('   Email:', userWithDelegation.email);
    console.log('   Starknet Address:', userWithDelegation.starknetAddr);
    console.log('   Amount Delegated:', userWithDelegation.delegation?.amountDelegated || 0, 'STRK');
    console.log('   Is Authorized (≥1 STRK):', (userWithDelegation.delegation?.amountDelegated || 0) >= 1);
    console.log('   Last Updated:', userWithDelegation.delegation?.lastUpdated);
  }
  
  console.log('\n✅ Schema verification complete!');
  process.exit(0);
}

verifySchema().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
