/**
 * Calculate status based on progress
 */
export function getStatusFromProgress(progress) {
    if (progress >= 70) return 'on_track';
    if (progress >= 40) return 'at_risk';
    return 'off_track';
}

/**
 * Get status badge component props
 */
export function getStatusBadgeProps(status) {
    const statusConfig = {
        on_track: {
            className: 'inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700',
            text: 'Đúng tiến độ'
        },
        at_risk: {
            className: 'inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700',
            text: 'Có nguy cơ'
        },
        off_track: {
            className: 'inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700',
            text: 'Chậm tiến độ'
        }
    };
    return statusConfig[status] || statusConfig.off_track;
}

/**
 * Get progress bar color class
 */
export function getProgressBarColor(progress) {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-red-500';
}

/**
 * Calculate objective progress from key results
 */
export function calculateObjectiveProgress(objective) {
    const krs = objective.keyResults || objective.key_results || [];
    if (krs.length > 0) {
        const totalProgress = krs.reduce((sum, kr) => {
            const krProgress = parseFloat(kr.progress_percent) || 0;
            return sum + krProgress;
        }, 0);
        return totalProgress / krs.length;
    }
    return parseFloat(objective.progress_percent) || 0;
}

/**
 * Get level text in Vietnamese
 */
export function getLevelText(level) {
    const levelMap = {
        company: 'Công ty',
        unit: 'Phòng ban',
        person: 'Cá nhân'
    };
    return levelMap[level] || 'N/A';
}

