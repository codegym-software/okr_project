export function mergeChildLinksIntoObjectives(items = [], childLinks = []) {
    if (!Array.isArray(items) || items.length === 0) return [];
    if (!Array.isArray(childLinks) || childLinks.length === 0) {
        return items;
    }

    return items.map((obj) => {
        const linkedChildren = childLinks.filter((link) => {
            const targetArchived =
                (link.targetObjective &&
                    (link.targetObjective.archived_at ||
                        link.targetObjective.archivedAt)) ||
                (link.targetKr &&
                    (link.targetKr.archived_at || link.targetKr.archivedAt));

            if (targetArchived) return false;

            const targetObjectiveId =
                link.targetObjective?.objective_id || link.target_objective_id;
            const targetKrId = link.targetKr?.kr_id || link.target_kr_id;

            return (
                targetObjectiveId === obj.objective_id && targetKrId == null
            );
        });

        const krLinkedObjectives = {};
        childLinks.forEach((link) => {
            const targetArchived =
                (link.targetObjective &&
                    (link.targetObjective.archived_at ||
                        link.targetObjective.archivedAt)) ||
                (link.targetKr &&
                    (link.targetKr.archived_at || link.targetKr.archivedAt));

            if (targetArchived) {
                return;
            }

            const targetKrId = link.targetKr?.kr_id || link.target_kr_id;
            const targetObjectiveId =
                link.targetObjective?.objective_id || link.target_objective_id;

            if (targetKrId && targetObjectiveId === obj.objective_id) {
                if (!krLinkedObjectives[targetKrId]) {
                    krLinkedObjectives[targetKrId] = [];
                }
                krLinkedObjectives[targetKrId].push(link);
            }
        });

        const virtualKRs = linkedChildren.map((link) => {
            const sourceObjective = link.sourceObjective || link.source_objective;
            const sourceKr = link.sourceKr || link.source_kr;
            const ownerUser =
                sourceKr?.assigned_user ||
                sourceKr?.assignedUser ||
                sourceObjective?.user ||
                null;
            const keyResults =
                sourceObjective?.keyResults ||
                sourceObjective?.key_results ||
                [];

            return {
                kr_id: `linked_${link.link_id}`,
                kr_title: sourceKr
                    ? `${sourceObjective?.obj_title || "Objective"} › ${
                          sourceKr.kr_title || "Key Result"
                      }`
                    : sourceObjective?.obj_title || "Linked Objective",
                target_value: sourceKr?.target_value || 0,
                current_value: sourceKr?.current_value || 0,
                unit: sourceKr?.unit || "number",
                status:
                    sourceKr?.status || sourceObjective?.status || "active",
                weight: sourceKr?.weight || 0,
                progress_percent:
                    sourceKr?.progress_percent ||
                    sourceObjective?.progress_percent ||
                    0,
                assigned_to:
                    sourceKr?.assigned_to ||
                    sourceObjective?.user_id ||
                    null,
                assigned_user: ownerUser,
                isLinked: true,
                isLinkedObjective: true,
                link: link,
                key_results: keyResults.map((kr) => ({
                    kr_id: kr.kr_id,
                    kr_title: kr.kr_title,
                    target_value: kr.target_value,
                    current_value: kr.current_value,
                    unit: kr.unit,
                    status: kr.status,
                    progress_percent: kr.progress_percent,
                    assigned_to: kr.assigned_to,
                    assigned_user:
                        kr.assigned_user ||
                        kr.assignedUser ||
                        kr.assignedUser,
                })),
            };
        });

        const updatedKeyResults = (obj.key_results || []).map((kr) => {
            const linkedObjs = krLinkedObjectives[kr.kr_id] || [];
            if (linkedObjs.length === 0) {
                return kr;
            }

            return {
                ...kr,
                linked_objectives: linkedObjs.map((link) => {
                    const sourceObjective =
                        link.sourceObjective || link.source_objective;
                    const keyResults =
                        sourceObjective?.keyResults ||
                        sourceObjective?.key_results ||
                        [];
                    return {
                        objective_id: sourceObjective?.objective_id,
                        obj_title:
                            sourceObjective?.obj_title || "Linked Objective",
                        description: sourceObjective?.description,
                        status: sourceObjective?.status,
                        progress_percent:
                            sourceObjective?.progress_percent || 0,
                        level: sourceObjective?.level,
                        user_id: sourceObjective?.user_id,
                        user: sourceObjective?.user,
                        key_results: keyResults.map((kr) => ({
                            kr_id: kr.kr_id,
                            kr_title: kr.kr_title,
                            target_value: kr.target_value,
                            current_value: kr.current_value,
                            unit: kr.unit,
                            status: kr.status,
                            progress_percent: kr.progress_percent,
                            assigned_to: kr.assigned_to,
                            assigned_user:
                                kr.assigned_user ||
                                kr.assignedUser ||
                                kr.assignedUser,
                        })),
                        is_linked: true,
                        link: link,
                    };
                }),
            };
        });

        return {
            ...obj,
            key_results: [...updatedKeyResults, ...virtualKRs],
        };
    });
}

let internalIdCounter = 0;
const generateId = () => `okr-node-${internalIdCounter++}`;

export function buildTreeFromObjectives(objectives = []) {
    const buildObjectiveNode = (objective) => {
        if (!objective) return null;
        const objectiveId =
            objective.objective_id != null
                ? `obj-${objective.objective_id}`
                : generateId();

        const node = {
            type: "objective",
            id: objectiveId,
            ...objective,
            children: [],
        };

        (objective.key_results || []).forEach((kr) => {
            if (kr?.isLinkedObjective) {
                const sourceObjective =
                    kr.link?.sourceObjective ||
                    kr.link?.source_objective ||
                    kr;

                const linkedNode = buildObjectiveNode({
                    ...sourceObjective,
                    objective_id:
                        sourceObjective?.objective_id || `linked-${kr.kr_id}`,
                    obj_title:
                        sourceObjective?.obj_title || kr.kr_title || "Objective",
                    progress_percent:
                        sourceObjective?.progress_percent ||
                        kr.progress_percent,
                    key_results:
                        sourceObjective?.key_results ||
                        sourceObjective?.keyResults ||
                        kr.key_results ||
                        [],
                });

                if (linkedNode) {
                    node.children.push(linkedNode);
                }
                return;
            }

            const krId =
                kr.kr_id != null ? `kr-${kr.kr_id}` : generateId();

            const krNode = {
                type: "key_result",
                id: krId,
                ...kr,
                children: [],
            };

            if (Array.isArray(kr.linked_objectives)) {
                kr.linked_objectives.forEach((linkedObjective) => {
                    const childObjective = buildObjectiveNode({
                        ...linkedObjective,
                        key_results:
                            linkedObjective.key_results ||
                            linkedObjective.keyResults ||
                            [],
                    });
                    if (childObjective) {
                        krNode.children.push(childObjective);
                    }
                });
            }

            node.children.push(krNode);
        });

        return node;
    };

    return objectives
        .map((objective) => buildObjectiveNode(objective))
        .filter(Boolean);
}

