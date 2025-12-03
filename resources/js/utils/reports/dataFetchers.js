/**
 * Fetch detailed data for Objectives, Key Results, Owners, Check-ins
 */
export async function fetchDetailedData(cycleId, departmentId, ownerId, currentLevel) {
    try {
        const params = new URLSearchParams();
        if (cycleId) params.set('cycle_id', cycleId);
        if (departmentId) params.set('department_id', departmentId);
        if (ownerId) params.set('owner_id', ownerId);
        params.set('per_page', '1000');
        
        let objectives = [];
        
        // Fetch objectives based on selected level
        if (currentLevel === 'company') {
            const companyParams = new URLSearchParams(params);
            companyParams.set('filter_type', 'company');
            const objRes = await fetch(`/company-okrs?${companyParams.toString()}`, { headers: { Accept: 'application/json' } });
            const objData = await objRes.json();
            objectives = objData.data?.objectives?.data || objData.data?.objectives || objData.data?.data || objData.data || [];
        } else if (currentLevel === 'departments') {
            const deptParams = new URLSearchParams(params);
            deptParams.set('filter_type', 'department');
            const deptRes = await fetch(`/company-okrs?${deptParams.toString()}`, { headers: { Accept: 'application/json' } });
            const deptData = await deptRes.json();
            objectives = deptData.data?.objectives?.data || deptData.data?.objectives || [];
        }
        
        // Fetch key results from objectives
        const keyResults = [];
        objectives.forEach(obj => {
            const krs = obj.keyResults || obj.key_results || [];
            if (Array.isArray(krs)) {
                krs.forEach(kr => {
                    keyResults.push({
                        ...kr,
                        objective_id: obj.objective_id,
                        objective_title: obj.obj_title,
                        objective_owner: obj.user,
                        objective_owner_id: obj.user_id,
                        assignedUser: kr.assignedUser || kr.assigned_user || null,
                        assigned_to: kr.assigned_to,
                    });
                });
            }
        });
        
        // Fetch check-ins
        let checkIns = [];
        try {
            if (keyResults.length > 0 && keyResults.length <= 50) {
                const checkInPromises = keyResults.map(async (kr) => {
                    try {
                        const res = await fetch(`/api/check-in/${kr.objective_id}/${kr.kr_id}/history`, { 
                            headers: { Accept: 'application/json' } 
                        });
                        if (res.ok) {
                            const response = await res.json();
                            const history = response.data?.check_ins || response.data?.checkIns || response.check_ins || response.checkIns || [];
                            return history.map(ci => ({
                                ...ci,
                                kr_id: kr.kr_id,
                                kr_title: kr.kr_title,
                                objective_id: kr.objective_id,
                                objective_title: kr.objective_title,
                            }));
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch check-ins for KR ${kr.kr_id}:`, e);
                    }
                    return [];
                });
                
                const results = await Promise.all(checkInPromises);
                checkIns = results.flat();
                
                const objectiveIds = new Set(objectives.map(obj => obj.objective_id));
                checkIns = checkIns.filter(ci => {
                    const ciObjectiveId = ci.objective_id || ci.objective?.objective_id || ci.objective?.id;
                    return objectiveIds.has(ciObjectiveId);
                });
            }
        } catch (e) {
            console.warn('Could not fetch check-ins:', e);
        }
        
        // Calculate owner statistics
        const ownerStats = {};
        const getOwnerKey = (userId) => {
            if (!userId) return 'unassigned';
            return String(userId);
        };
        
        objectives.forEach(obj => {
            const ownerId = obj.user_id || obj.user?.user_id;
            const ownerName = obj.user?.full_name || obj.user?.name || 'Chưa gán';
            const ownerKey = getOwnerKey(ownerId);
            
            if (!ownerStats[ownerKey]) {
                ownerStats[ownerKey] = {
                    owner_id: ownerId,
                    owner_name: ownerName,
                    objectives: [],
                    keyResults: [],
                    totalObjectiveProgress: 0,
                    totalKrProgress: 0,
                    onTrack: 0,
                    atRisk: 0,
                    offTrack: 0,
                };
            }
            ownerStats[ownerKey].objectives.push(obj);
        });
        
        keyResults.forEach(kr => {
            const assigneeId = kr.assignedUser?.user_id || kr.assigned_to || null;
            const assigneeName = kr.assignedUser?.full_name || null;
            const ownerId = assigneeId || kr.objective_owner_id || kr.objective_owner?.user_id;
            const ownerName = assigneeName || kr.objective_owner?.full_name || kr.objective_owner?.name || 'Chưa gán';
            const ownerKey = getOwnerKey(ownerId);
            
            if (!ownerStats[ownerKey]) {
                ownerStats[ownerKey] = {
                    owner_id: ownerId,
                    owner_name: ownerName,
                    objectives: [],
                    keyResults: [],
                    totalObjectiveProgress: 0,
                    totalKrProgress: 0,
                    onTrack: 0,
                    atRisk: 0,
                    offTrack: 0,
                };
            }
            ownerStats[ownerKey].keyResults.push(kr);
            
            const krProgress = parseFloat(kr.progress_percent) || 0;
            ownerStats[ownerKey].totalKrProgress += krProgress;
            
            if (krProgress >= 70) ownerStats[ownerKey].onTrack++;
            else if (krProgress >= 40) ownerStats[ownerKey].atRisk++;
            else ownerStats[ownerKey].offTrack++;
        });
        
        const owners = Object.values(ownerStats).map(owner => {
            const averageProgress = owner.keyResults.length > 0 
                ? parseFloat((owner.totalKrProgress / owner.keyResults.length).toFixed(2))
                : 0;
            
            return {
                ...owner,
                averageProgress,
                totalObjectives: owner.objectives.length,
                totalKeyResults: owner.keyResults.length,
            };
        });
        
        return {
            objectives,
            keyResults,
            owners,
            checkIns,
        };
    } catch (e) {
        console.error('Failed to fetch detailed data:', e);
        return {
            objectives: [],
            keyResults: [],
            owners: [],
            checkIns: [],
        };
    }
}

/**
 * Fetch detailed data for snapshot (helper function, doesn't set state)
 */
export async function fetchDetailedDataForSnapshot(cycleId, departmentId, ownerId, currentLevel) {
    // Same logic as fetchDetailedData but for snapshot creation
    return fetchDetailedData(cycleId, departmentId, ownerId, currentLevel);
}

