/**
 * Load snapshots from API
 */
export async function loadSnapshots(cycleId, page = 1) {
    try {
        const params = new URLSearchParams();
        if (cycleId) params.set('cycle_id', cycleId);
        params.set('page', page);
        const url = `/api/reports/snapshots?${params.toString()}`;
        console.log('Fetching snapshots from:', url);
        
        const response = await fetch(url, {
            headers: { Accept: 'application/json' }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            console.log('Snapshots count:', data.data.data?.length || 0);
            return {
                snapshots: data.data.data || [],
                pagination: {
                    current_page: data.data.current_page || 1,
                    last_page: data.data.last_page || 1,
                    total: data.data.total || 0,
                }
            };
        }
        console.warn('Response not successful:', data);
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
        const url = `/api/reports/snapshots/${snapshotId}`;
        console.log('Fetching snapshot from:', url);
        
        const response = await fetch(url, {
            headers: { Accept: 'application/json' }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            return data.data;
        }
        console.warn('Response not successful:', data);
        return null;
    } catch (error) {
        console.error('Lỗi khi tải snapshot:', error);
        return null;
    }
}

