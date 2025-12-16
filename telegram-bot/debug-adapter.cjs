
const { PrismaClient } = require('@prisma/client');
const AdminJSPrisma = require('@adminjs/prisma');

const prisma = new PrismaClient();

async function debug() {
    console.log('--- AdminJSPrisma Require Dump ---');
    console.log(AdminJSPrisma);

    // Check for common export patterns
    const Resource = AdminJSPrisma.Resource || (AdminJSPrisma.default && AdminJSPrisma.default.Resource);
    const Database = AdminJSPrisma.Database || (AdminJSPrisma.default && AdminJSPrisma.default.Database);
    const getModelByName = AdminJSPrisma.getModelByName || (AdminJSPrisma.default && AdminJSPrisma.default.getModelByName);

    console.log('\n--- Extracted Components ---');
    console.log('Resource type:', typeof Resource);
    console.log('Database type:', typeof Database);
    console.log('getModelByName type:', typeof getModelByName);

    if (!Resource) {
        console.error('CRITICAL: Resource adapter not found!');
        return;
    }

    console.log('\n--- Resource Validation Test ---');
    // Mock DMMF model to see if it is accepted
    const mockDMMF = { name: 'Category', fields: [] };

    try {
        // Test with simple object matching DMMF shape if we can't get real one easily without TS
        // Actually, we can get real one:
        // @ts-ignore
        const realDMMF = prisma._runtimeDataModel && prisma._runtimeDataModel.models ? prisma._runtimeDataModel.models.Category : null;
        console.log('Real DMMF model found:', !!realDMMF);

        if (realDMMF) {
            console.log('Is Adapter For Real DMMF:', Resource.isAdapterFor({ model: realDMMF, client: prisma }));
        }
    } catch (e) {
        console.log('Error checking adapter:', e.message);
    }
}

debug().catch(console.error).finally(() => prisma.$disconnect());
