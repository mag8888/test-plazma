
import { PrismaClient } from '@prisma/client';
import * as AdminJSPrisma from '@adminjs/prisma';

const prisma = new PrismaClient();

async function debug() {
    console.log('--- AdminJSPrisma Import Dump ---');
    console.log(AdminJSPrisma);

    console.log('\n--- Default Export Check ---');
    // @ts-ignore
    const defaultExport = AdminJSPrisma.default;
    console.log('Default Export:', defaultExport);

    // Attempt extraction
    // @ts-ignore
    const { Resource, Database } = defaultExport || AdminJSPrisma;

    console.log('\n--- Extracted Components ---');
    console.log('Resource type:', typeof Resource);
    console.log('Database type:', typeof Database);

    if (!Resource) {
        console.error('CRITICAL: Resource adapter not found!');
        return;
    }

    console.log('\n--- Resource Validation Test ---');

    // Test 1: Delegate
    try {
        const isAdapterForDelegate = Resource.isAdapterFor({ model: prisma.category, client: prisma });
        console.log('Is Adapter For (Delegate - prisma.category):', isAdapterForDelegate);
    } catch (e) {
        console.log('Check Delegate failed:', e.message);
    }

    // Test 2: DMMF
    try {
        // @ts-ignore
        const dmmf = (prisma as any)._runtimeDataModel.models.Category;
        console.log('DMMF Model found:', !!dmmf);
        const isAdapterForDMMF = Resource.isAdapterFor({ model: dmmf, client: prisma });
        console.log('Is Adapter For (DMMF):', isAdapterForDMMF);
    } catch (e) {
        console.log('Check DMMF failed:', e.message);
    }

    // Test 3: String Name (Experimental)
    try {
        const isAdapterForString = Resource.isAdapterFor({ model: 'Category', client: prisma });
        console.log('Is Adapter For (String):', isAdapterForString);
    } catch (e) {
        console.log('Check String failed:', e.message);
    }

}

debug().catch(console.error).finally(() => prisma.$disconnect());
