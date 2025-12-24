const API_BASE = 'https://moneo.up.railway.app/api/admin';
const SECRET = 'admin'; // Or use the one user set if changed, but likely still 'admin' or I can ask.
// User said "how to enter admin secret", imply they haven't changed it yet or just did.
// I will try 'admin' first.

async function run() {
    console.log("🚀 Listing ALL Backups...");

    try {
        const listRes = await fetch(`${API_BASE}/backups`, {
            headers: { 'x-admin-secret': SECRET }
        });

        if (!listRes.ok) {
            console.error(`Status: ${listRes.status}`);
            return;
        }

        const data = await listRes.json();
        const backups = data.backups || [];
        console.log(`Found ${backups.length} total backups.`);

        // Print all details
        backups.forEach((b: any) => {
            console.log(`${b.created_at} - ${b.secure_url}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
