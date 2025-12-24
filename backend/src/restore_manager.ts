export { };
// Restoration Manager Script
// Run locally to orchestrate the backend restore process

const API_BASE = 'https://moneo.up.railway.app/api/admin';
const SECRET = 'adminroman: R7#x9$vL2mPz!Q5';

async function run() {
    console.log("🚀 Starting Smart Restore...");

    // 1. List Backups
    try {
        const listRes = await fetch(`${API_BASE}/backups`, {
            headers: { 'x-admin-secret': SECRET }
        });

        if (!listRes.ok) {
            throw new Error(`Failed to list backups: ${listRes.status}`);
        }

        const data = await listRes.json();
        const backups = data.backups || [];
        console.log(`Found ${backups.length} total backups.`);

        // 2. Filter for "real" data (e.g. > 5KB)
        // Empty DB backup is likely very small. 19KB seems to be the steady state before today.
        const validBackups = backups.filter((b: any) => b.bytes > 5000); // Filter out tiny files
        validBackups.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Newest first

        if (validBackups.length === 0) {
            console.log("⚠️ No valid (>5KB) backups found.");
            return;
        }

        const target = validBackups[0]; // Restoring the LATEST valid backup
        console.log(`\n🎯 Target Backup: ${target.created_at} (${target.bytes} bytes)`);
        console.log(`URL: ${target.secure_url}`);

        // 3. Restore
        const restoreRes = await fetch(`${API_BASE}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': SECRET
            },
            body: JSON.stringify({ url: target.secure_url })
        });

        if (!restoreRes.ok) {
            console.error(`❌ Restore Failed: ${restoreRes.status}`);
            const text = await restoreRes.text();
            console.error(text);
            return;
        }

        const resData = await restoreRes.json();
        console.log(`✅ Success! Restored ${resData.restored} users.`);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
