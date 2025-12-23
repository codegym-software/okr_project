const getToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

const handleResponse = async (res) => {
    const json = await res.json();
    if (!res.ok || !json.success) {
        throw new Error(json.message || `An unknown error occurred.`);
    }
    return json.data;
};

export async function fetchDetailedData(filters) {
    const params = new URLSearchParams();
    params.set('cycle_id', filters.cycleId);
    
    const url = `/api/reports/okr-company?${params.toString()}`;
    const res = await fetch(url, { 
        headers: { 
            Accept: 'application/json', 
            'Cache-Control': 'no-cache', 
            'X-CSRF-TOKEN': getToken() 
        } 
    });
    return handleResponse(res);
}

export async function fetchDetailedDataForSnapshot(snapshotId, currentTab) {
    const params = new URLSearchParams();
    params.set('tab', currentTab);
    
    const url = `/api/reports/snapshots/${snapshotId}?${params.toString()}`;
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': getToken()
        }
    });
    return handleResponse(res);
}

export async function createSnapshot(snapshotDetails) {
    const url = '/api/reports/snapshots/create';
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getToken()
        },
        body: JSON.stringify(snapshotDetails)
    });
    return handleResponse(res);
}
