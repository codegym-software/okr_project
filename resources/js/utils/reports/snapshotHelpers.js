/**
 * Load snapshots from API
 */
export async function loadSnapshots(cycleId, page = 1) {
    try {
        const params = new URLSearchParams();
        if (cycleId) params.set('cycle_id', cycleId);
        params.set('page', page);
        const response = await fetch(`/api/reports/snapshots?${params.toString()}`, {
            headers: { Accept: 'application/json' }
        });
        const data = await response.json();
        if (data.success) {
            return {
                snapshots: data.data.data || [],
                pagination: {
                    current_page: data.data.current_page || 1,
                    last_page: data.data.last_page || 1,
                    total: data.data.total || 0,
                }
            };
        }
        return { snapshots: [], pagination: { current_page: 1, last_page: 1, total: 0 } };
    } catch (error) {
        console.error('Lỗi khi tải snapshots:', error);
        return { snapshots: [], pagination: { current_page: 1, last_page: 1, total: 0 } };
    }
}

/**
 * Load a single snapshot by ID
 */
export async function loadSnapshot(snapshotId) {
    try {
        const response = await fetch(`/api/reports/snapshots/${snapshotId}`, {
            headers: { Accept: 'application/json' }
        });
        const data = await response.json();
        if (data.success) {
            return data.data;
        }
        return null;
    } catch (error) {
        console.error('Lỗi khi tải snapshot:', error);
        return null;
    }
}

