export { };
// Restoration Manager Script
// Run locally to orchestrate the backend restore process

const API_BASE = 'https://moneo.up.railway.app/api/admin';
const SECRET = 'admin'; // Default secret

async function run() {
    console.log("🚀 Starting Restore Manager...");

    // 1. List Backups
    console.log("Fetching backup list...");
    try {
        const listRes = await fetch(`${API_BASE}/backups`, {
            headers: { 'x-admin-secret': SECRET }
        });

        if (!listRes.ok) {
            throw new Error(`Failed to list backups: ${listRes.status} ${listRes.statusText}`);
        }

        const data = await listRes.json();
        const backups = data.backups || [];
        console.log(`Found ${backups.length} total backups.`);

        // 2. Filter last 24h
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - ONE_DAY_MS;

        const recentBackups = backups.filter((b: any) => {
            const time = new Date(b.created_at).getTime();
            return time > cutoff;
        });

        console.log(`Found ${recentBackups.length} backups in the last 24h.`);

        // 3. Sort Oldest -> Newest
        // We want to process oldest first so that newer data overwrites older data if conflicts exist,
        // but missing data (from old backups) is preserved.
        recentBackups.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // 4. Restore Sequentially
        for (const backup of recentBackups) {
            console.log(`\nProcessing Backup: ${backup.created_at} (${backup.secure_url})...`);

            try {
                const restoreRes = await fetch(`${API_BASE}/restore`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-secret': SECRET
                    },
                    body: JSON.stringify({ url: backup.secure_url })
                });

                if (!restoreRes.ok) {
                    console.error(`❌ Restore Failed for ${backup.created_at}: ${restoreRes.status}`);
                    const errText = await restoreRes.text();
                    console.error(errText);
                    continue;
                }

                const resData = await restoreRes.json();
                console.log(`✅ Success: Restored ${resData.restored} users.`);
            } catch (e) {
                console.error(`❌ Exception restoring ${backup.created_at}:`, e);
            }
        }

        console.log("\n🎉 Full Restoration Sequence Complete.");

    } catch (e) {
        console.error("Critical Error:", e);
    }
}

run();
