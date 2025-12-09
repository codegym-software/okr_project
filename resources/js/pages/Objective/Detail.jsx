import React, { useState, useEffect, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { format, isToday, isYesterday, differenceInMinutes, differenceInHours } from 'date-fns';
import { InformationCircleIcon, CalendarIcon, UserCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import OkrTreeCanvas from "../../components/okr/OkrTreeCanvas";
import { mergeChildLinksIntoObjectives, buildTreeFromObjectives } from "../../utils/okrHierarchy";

// --- Reusable Tabs Component ---
const Tabs = ({ tabs, activeTab: controlledActiveTab, onTabChange }) => {
    const [internalActiveTab, setInternalActiveTab] = useState(0);
    const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
    
    const handleTabChange = (index) => {
        if (onTabChange) {
            onTabChange(index);
        } else {
            setInternalActiveTab(index);
        }
    };

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.name}
                            onClick={() => handleTabChange(index)}
                            className={`${
                                index === activeTab
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="py-6">
                {tabs[activeTab]?.content}
            </div>
        </div>
    );
};

const getStatusClass = (status) => {
    switch (status) {
        case 'on_track': return 'bg-green-100 text-green-800';
        case 'at_risk': return 'bg-yellow-100 text-yellow-800';
        case 'behind': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const OverviewSection = ({ objective }) => (
    <div>
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-lg font-bold text-blue-600">{objective.progress_percent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-5 relative overflow-hidden border border-slate-200">
                <div className="bg-blue-600 h-5 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, objective.progress_percent || 0))}%` }}></div>
            </div>
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        Chu kỳ
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 ml-7">{objective.cycle?.cycle_name || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                        Chủ sở hữu
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 ml-7">{objective.user?.full_name || objective.department?.d_name || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                        Mô tả
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap ml-7">{objective.description || 'Không có mô tả.'}</dd>
                </div>
            </dl>
        </div>
    </div>
);

const KeyResultsSection = ({ keyResults, objective }) => (
    <div className="space-y-4">
        {keyResults?.length > 0 ? keyResults.map(kr => (
            <div key={kr.kr_id} className="p-4 border rounded-lg hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-center mb-2">
                    <a href={objective?.level === "person" 
                        ? `/my-objectives/key-result-details/${kr.kr_id}`
                        : `/company-okrs/detail/kr/${kr.kr_id}`} 
                        className="font-semibold text-blue-700 hover:underline">{kr.kr_title}</a>
                    <span className="text-base font-bold text-gray-800">{kr.progress_percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 relative overflow-hidden border border-slate-200">
                    <div className={`h-4 rounded-full transition-all duration-300 ${
                        kr.status === "completed"
                            ? "bg-emerald-600"
                            : kr.status === "active"
                            ? "bg-blue-600"
                            : "bg-slate-500"
                    }`} style={{ width: `${Math.min(100, Math.max(0, kr.progress_percent || 0))}%` }}></div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                    Owner: <span className="font-medium text-gray-800">{kr.assigned_user?.full_name || 'N/A'}</span>
                </div>
            </div>
        )) : <p className="text-gray-500">Không có Key Result nào.</p>}
    </div>
);

const AlignmentSection = ({ objective }) => (
    <div className="space-y-8">
        {/* Parent OKR Section */}
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Liên kết Cấp trên (Parent OKR)</h3>
            {objective.source_links?.length > 0 ? (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {objective.source_links.map(link => (
                        <div key={link.link_id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <a 
                                    href={link.target_objective?.level === "person"
                                        ? `/my-objectives/details/${link.target_objective.objective_id}`
                                        : `/company-okrs/detail/${link.target_objective.objective_id}`} 
                                    className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                                >
                                    {link.target_objective.obj_title}
                                </a>
                                <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <span className="font-medium text-gray-700">{objective.obj_title}</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                                {link.target_objective.user?.full_name || link.target_objective.department?.d_name || 'N/A'}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center">
                    <p className="text-gray-500 text-sm">Objective này không liên kết lên OKR nào.</p>
                </div>
            )}
        </div>

        {/* Child OKR Section */}
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Liên kết Cấp dưới (Child OKR)</h3>
            {objective.child_objectives?.length > 0 ? (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {objective.child_objectives.map(link => (
                        <div key={link.link_id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-700">{objective.obj_title}</span>
                                <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <a 
                                    href={link.source_objective?.level === "person"
                                        ? `/my-objectives/details/${link.source_objective.objective_id}`
                                        : `/company-okrs/detail/${link.source_objective.objective_id}`} 
                                    className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                                >
                                    {link.source_objective.obj_title}
                                </a>
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                                {link.source_objective.user?.full_name || link.source_objective.department?.d_name || 'N/A'}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center">
                    <p className="text-gray-500 text-sm">Không có OKR nào liên kết với Objective này.</p>
                </div>
            )}
        </div>
    </div>
);

const HistorySection = ({ keyResults, comments, objectiveId, onCommentPosted }) => {
    // This section now combines Check-ins and Comments
    const allCheckIns = keyResults.flatMap(kr => kr.check_ins.map(ci => ({ ...ci, kr_title: kr.kr_title })));
    allCheckIns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Tạo map để lưu progress_percent của check-in trước đó cho mỗi KR
    // Vì đã sort mới nhất trước, nên check-in trước đó (theo thời gian) sẽ là check-in sau đó trong mảng
    const getPreviousProgress = (currentIndex, currentKrTitle, currentCreatedAt) => {
        // Tìm check-in trước đó của cùng KR (có thời gian cũ hơn)
        for (let i = currentIndex + 1; i < allCheckIns.length; i++) {
            if (allCheckIns[i].kr_title === currentKrTitle && 
                new Date(allCheckIns[i].created_at) < new Date(currentCreatedAt)) {
                return allCheckIns[i].progress_percent;
            }
        }
        return null;
    };

    return (
        <div>
            <div className="mb-6">
                <h4 className="font-semibold text-md mb-2">Lịch sử Check-in</h4>
                 {allCheckIns.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                        {allCheckIns.map((ci, index) => {
                            const previousProgress = getPreviousProgress(index, ci.kr_title, ci.created_at);
                            const progressText = previousProgress !== null 
                                ? `${previousProgress}% → ${ci.progress_percent}%`
                                : `${ci.progress_percent}%`;
                            
                            return (
                                <div key={ci.check_in_id} className="text-sm p-2 border-l-4 border-gray-200">
                                    <p><strong>{ci.user?.full_name || '...'}</strong> đã check-in cho KR <strong>"{ci.kr_title}"</strong></p>
                                    <div className="text-xs text-gray-500 mt-1">
                                        <span className="font-semibold">{progressText}</span>
                                    </div>
                                    <p className="text-gray-700 mt-1">"{ci.notes || 'Không có ghi chú'}"</p>
                                    <div className="text-xs text-gray-500 mt-1">
                                        <span>{format(new Date(ci.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-gray-500 text-sm">Chưa có lịch sử check-in.</p>}
            </div>
            
            <CommentSection comments={comments} objectiveId={objectiveId} onCommentPosted={onCommentPosted} />
        </div>
    );
};

const CommentForm = ({ objectiveId, parentId = null, onSubmitted }) => {
    const [content, setContent] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const submit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`/api/objectives/${objectiveId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    content: content,
                    parent_id: parentId,
                }),
            });

            if (response.status === 422) {
                const errorData = await response.json();
                setErrors(errorData.errors);
                return;
            }

            if (!response.ok) {
                throw new Error('Something went wrong');
            }

            const newComment = await response.json();
            setContent('');
            if (onSubmitted) onSubmitted(newComment);
        } catch (error) {
            setErrors({ form: 'Could not submit your comment. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className={`mt-2 ${parentId ? 'ml-8' : ''}`}>
            <div className="relative">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm text-sm 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                               transition-all duration-200 resize-y
                               placeholder:text-slate-400 text-slate-700
                               bg-white hover:border-slate-400"
                    placeholder={parentId ? "Viết trả lời..." : "Viết bình luận..."}
                    rows={parentId ? 2 : 3}
                ></textarea>
            </div>
            {errors.content && <p className="text-red-500 text-xs mt-1 ml-1">{errors.content[0]}</p>}
            {errors.form && <p className="text-red-500 text-xs mt-1 ml-1">{errors.form}</p>}
            <div className="flex justify-end mt-3">
                <button 
                    type="submit" 
                    disabled={processing || !content.trim()} 
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold 
                               hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed 
                               transition-all duration-200 shadow-sm hover:shadow-md
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {processing ? 'Đang gửi...' : 'Gửi'}
                </button>
            </div>
        </form>
    );
};

const Comment = ({ comment, objectiveId, depth = 0, onReplyPosted }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const canReply = depth < 2; // Chỉ cho phép trả lời đến độ sâu 2 (0, 1, 2)
    
    const handleReplySubmitted = (newReply) => {
        setShowReplyForm(false);
        if (onReplyPosted) {
            onReplyPosted(newReply);
        }
    };
    
    return (
        <div className="py-3">
            <div className="flex items-start gap-3">
                <img 
                    src={comment.user?.avatar_url || '/images/default.png'} 
                    alt={comment.user?.full_name} 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 flex-shrink-0" 
                />
                <div className="flex-1 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                    <div className="font-semibold text-sm text-slate-900 mb-1">{comment.user?.full_name}</div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                </div>
            </div>
            <div className="ml-11 text-xs text-slate-500 mt-2 flex items-center gap-3">
                <span>{formatCommentTime(comment.created_at)}</span>
                {canReply && (
                    <button 
                        onClick={() => setShowReplyForm(!showReplyForm)} 
                        className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                        Trả lời
                    </button>
                )}
            </div>
            {showReplyForm && canReply && <CommentForm objectiveId={objectiveId} parentId={comment.id} onSubmitted={handleReplySubmitted} />}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 mt-3 pl-4 border-l-2 border-slate-200">
                    {comment.replies.map(reply => (
                        <Comment 
                            key={reply.id} 
                            comment={reply} 
                            objectiveId={objectiveId} 
                            depth={depth + 1} 
                            onReplyPosted={onReplyPosted}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CommentSection = ({ comments: initialComments, objectiveId, onCommentPosted }) => {
    const [comments, setComments] = useState(initialComments || []);

    // Cập nhật comments khi initialComments thay đổi (từ parent)
    // Sort comments từ mới nhất đến cũ nhất
    useEffect(() => {
        const sortedComments = (initialComments || []).map(comment => ({
            ...comment,
            replies: (comment.replies || []).sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            )
        })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setComments(sortedComments);
    }, [initialComments]);

    const handleSubmitted = (newComment) => {
        if (newComment) {
            // Nếu là reply, thêm vào replies của parent
            if (newComment.parent_id) {
                setComments(prevComments => 
                    prevComments.map(comment => {
                        if (comment.id === newComment.parent_id) {
                            return {
                                ...comment,
                                replies: [...(comment.replies || []), newComment].sort((a, b) => 
                                    new Date(b.created_at) - new Date(a.created_at)
                                )
                            };
                        }
                        // Tìm trong replies
                        const updateReplies = (replies) => {
                            return replies.map(reply => {
                                if (reply.id === newComment.parent_id) {
                                    return {
                                        ...reply,
                                        replies: [...(reply.replies || []), newComment].sort((a, b) => 
                                            new Date(b.created_at) - new Date(a.created_at)
                                        )
                                    };
                                }
                                if (reply.replies && reply.replies.length > 0) {
                                    return {
                                        ...reply,
                                        replies: updateReplies(reply.replies)
                                    };
                                }
                                return reply;
                            });
                        };
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateReplies(comment.replies)
                            };
                        }
                        return comment;
                    })
                );
            } else {
                // Nếu là comment mới, thêm vào đầu danh sách và sort lại
                setComments(prevComments => {
                    const updated = [newComment, ...prevComments];
                    return updated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                });
            }
        }
        if (onCommentPosted) onCommentPosted();
    };

    return (
        <div className="mt-4">
            <h4 className="font-semibold text-md mb-2">Thảo luận (Comment)</h4>
            <div className="space-y-4">
                <CommentForm objectiveId={objectiveId} onSubmitted={handleSubmitted} />
                {comments?.length > 0 ? (
                    comments.map(comment => (
                        <Comment key={comment.id} comment={comment} objectiveId={objectiveId} onReplyPosted={handleSubmitted} />
                    ))
                ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có bình luận nào.</p>
                )}
            </div>
        </div>
    );
};


// --- Helper function to format comment time ---
const formatCommentTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, date);
    const diffHours = differenceInHours(now, date);
    
    // Vừa xong (< 1 phút)
    if (diffMinutes < 1) {
        return 'Vừa xong';
    }
    
    // Gần đây (< 1 giờ): "X phút trước"
    if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
    }
    
    // Gần đây (< 24 giờ): "X giờ trước"
    if (diffHours < 24) {
        return `${diffHours} giờ trước`;
    }
    
    // Hôm nay: "Hôm nay HH:mm"
    if (isToday(date)) {
        return `Hôm nay ${format(date, 'HH:mm')}`;
    }
    
    // Hôm qua: "Hôm qua HH:mm"
    if (isYesterday(date)) {
        return `Hôm qua ${format(date, 'HH:mm')}`;
    }
    
    // Cũ hơn: chỉ ngày tháng năm
    return format(date, 'dd/MM/yyyy');
};

// --- Main Page Component (Refactored for Tabs) ---

const DetailsSection = ({ objective }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">Tổng quan</h3>
                <OverviewSection objective={objective} />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">Key Results</h3>
                <KeyResultsSection keyResults={objective.key_results} objective={objective} />
            </div>
        </div>
    </div>
);

const TreeViewSection = ({ objective }) => {
    const [treeLayout, setTreeLayout] = useState("horizontal");
    const [treeRootId, setTreeRootId] = useState(null);
    const [childLinks, setChildLinks] = useState([]);
    const [linksLoading, setLinksLoading] = useState(true);

    // Fetch all child links (similar to ObjectivesPage)
    useEffect(() => {
        const fetchLinks = async () => {
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
                const response = await fetch("/my-links", {
                    headers: { Accept: "application/json", "X-CSRF-TOKEN": token }
                });
                const json = await response.json();
                if (json.success && json.data?.children) {
                    // Normalize links similar to ObjectivesPage
                    const normalizeLinkData = (link) => {
                        if (!link || typeof link !== "object") return link;
                        const pickRelation = (l, camel, snake) => (l && l[camel]) || (l && l[snake]) || null;
                        return {
                            ...link,
                            sourceObjective: pickRelation(link, "sourceObjective", "source_objective"),
                            sourceKr: pickRelation(link, "sourceKr", "source_kr"),
                            targetObjective: pickRelation(link, "targetObjective", "target_objective"),
                            targetKr: pickRelation(link, "targetKr", "target_kr"),
                        };
                    };
                    const normalizeLinksList = (list) => Array.isArray(list) ? list.map(normalizeLinkData) : [];
                    setChildLinks(normalizeLinksList(json.data.children || []));
                }
            } catch (error) {
                console.error("Failed to fetch links:", error);
            } finally {
                setLinksLoading(false);
            }
        };
        fetchLinks();
    }, []);

    // Build list of objectives from current + parent + children
    const allObjectives = useMemo(() => {
        const objectives = [];
        
        // Add current objective
        if (objective) {
            objectives.push({
                ...objective,
                key_results: objective.key_results || []
            });
        }

        // Add parent objectives (from source_links)
        if (objective?.source_links) {
            objective.source_links.forEach(link => {
                if (link.target_objective) {
                    objectives.push({
                        ...link.target_objective,
                        key_results: link.target_objective.key_results || []
                    });
                }
            });
        }

        // Add child objectives (from child_objectives)
        if (objective?.child_objectives) {
            objective.child_objectives.forEach(link => {
                if (link.source_objective) {
                    objectives.push({
                        ...link.source_objective,
                        key_results: link.source_objective.key_results || []
                    });
                }
            });
        }

        return objectives;
    }, [objective]);

    // Merge child links into objectives
    const enrichedItems = useMemo(
        () => mergeChildLinksIntoObjectives(allObjectives, childLinks),
        [allObjectives, childLinks]
    );

    // Build tree nodes
    const treeNodes = useMemo(
        () => buildTreeFromObjectives(enrichedItems),
        [enrichedItems]
    );

    // Filter by treeRootId if set
    const treeDataForRender = useMemo(() => {
        if (!treeNodes.length) return [];
        if (!treeRootId) return treeNodes;
        return treeNodes.filter(
            (node) =>
                String(node.objective_id || node.id) === String(treeRootId)
        );
    }, [treeNodes, treeRootId]);

    // Set treeRootId to current objective ID (no need for selector in detail page)
    useEffect(() => {
        if (objective?.objective_id) {
            setTreeRootId(objective.objective_id);
        }
    }, [objective?.objective_id]);

    // Read tree_layout from URL on mount and when URL changes
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const layoutParam = urlParams.get('tree_layout');
        
        if (layoutParam === 'horizontal' || layoutParam === 'vertical') {
            setTreeLayout(layoutParam);
        }
    }, [window.location.search]);

    // Update URL when treeLayout changes (but not root_objective_id)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const currentTab = urlParams.get('tab');
        if (currentTab === 'tree') {
            const url = new URL(window.location);
            // Remove root_objective_id if it exists
            url.searchParams.delete('root_objective_id');
            url.searchParams.set('tree_layout', treeLayout);
            window.history.replaceState({}, '', url);
        }
    }, [treeLayout]);

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    return (
        <div className="w-full space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
                {/* Button Xem ngang/dọc - bên trái */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setTreeLayout((prev) =>
                                prev === "horizontal" ? "vertical" : "horizontal"
                            )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        title={
                            treeLayout === "horizontal"
                                ? "Chuyển sang hiển thị dọc"
                                : "Chuyển sang hiển thị ngang"
                        }
                    >
                        <svg
                            className="h-4 w-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                        </svg>
                        {treeLayout === "horizontal" ? "Xem ngang" : "Xem dọc"}
                    </button>
                </div>

                {/* 4 button controls - bên phải */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => reactFlowInstance?.zoomIn()}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        title="Phóng to"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => reactFlowInstance?.zoomOut()}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        title="Thu nhỏ"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => reactFlowInstance?.fitView({ padding: 0.2, maxZoom: 1.5 })}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        title="Vừa màn hình"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsLocked(!isLocked)}
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm ${isLocked ? 'bg-gray-100' : ''}`}
                        title={isLocked ? "Mở khóa" : "Khóa"}
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isLocked ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tree Canvas */}
            <div className="w-full">
                {!treeDataForRender || treeDataForRender.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">Không có dữ liệu tree view</div>
                    </div>
                ) : (
                    <OkrTreeCanvas
                        data={treeDataForRender}
                        loading={false}
                        emptyMessage="Không có dữ liệu tree view"
                        height={600}
                        showLayoutToggle={false}
                        layoutDirection={treeLayout}
                        onLayoutDirectionChange={setTreeLayout}
                        onInit={setReactFlowInstance}
                        nodesDraggable={!isLocked}
                        nodesConnectable={false}
                    />
                )}
            </div>
        </div>
    );
};

const ObjectiveDetailPage = () => {
    const [objective, setObjective] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTabIndex, setActiveTabIndex] = useState(0); // Mặc định tab "Chi tiết"

    // Map tab names to indices
    const tabMap = {
        'details': 0,
        'links': 1,
        'history': 2,
        'tree': 3
    };

    const getTabIndexFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        return tabParam && tabMap[tabParam] !== undefined ? tabMap[tabParam] : 0;
    };

    const updateUrlForTab = (tabIndex) => {
        const tabNames = ['details', 'links', 'history', 'tree'];
        const tabName = tabNames[tabIndex] || 'details';
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        
        // Nếu là tab tree, thêm tree_layout (không thêm root_objective_id)
        if (tabName === 'tree') {
            if (!url.searchParams.has('tree_layout')) {
                url.searchParams.set('tree_layout', 'horizontal');
            }
            // Xóa root_objective_id nếu có
            url.searchParams.delete('root_objective_id');
        } else {
            // Xóa tree params khi không ở tab tree
            url.searchParams.delete('root_objective_id');
            url.searchParams.delete('tree_layout');
        }
        
        window.history.pushState({}, '', url);
    };

    const handleTabChange = (newTabIndex) => {
        setActiveTabIndex(newTabIndex);
        updateUrlForTab(newTabIndex);
    };

    const getObjectiveIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    };

    const fetchData = async () => {
        const objectiveId = getObjectiveIdFromUrl();
        if (!objectiveId) {
            setError("Không tìm thấy ID của Objective trong URL.");
            setLoading(false);
            return;
        }

        // Kiểm tra xem URL có phải là my-objectives không
        const isMyObjective = window.location.pathname.includes('/my-objectives/details/');
        const apiUrl = isMyObjective 
            ? `/api/my-objectives/details/${objectiveId}?_t=${new Date().getTime()}`
            : `/company-okrs/${objectiveId}?_t=${new Date().getTime()}`;

        try {
            setLoading(true);
            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(errorJson.message || 'Network response was not ok');
            }
            
            const json = await response.json();

            if (json.success) {
                setObjective(json.data);
            } else {
                throw new Error(json.message || 'Không thể tải dữ liệu Objective.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Check query parameter để tự động mở tab tương ứng
        const tabIndex = getTabIndexFromUrl();
        setActiveTabIndex(tabIndex);
    }, [window.location.pathname, window.location.search]);

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;
    if (!objective) return <div className="p-8 text-center">Không tìm thấy Objective.</div>;

    const handleCommentPosted = () => {
        // Không cần reload vì comment đã được cập nhật realtime
        // Chỉ cần để callback này để tương thích với component
    };
    
    const pageTabs = [
        { name: 'Chi tiết', content: <DetailsSection objective={objective} /> },
        { name: 'Ngữ cảnh & Liên kết', content: <AlignmentSection objective={objective} /> },
        { name: 'Lịch sử & Tương tác', content: <HistorySection keyResults={objective.key_results} comments={objective.comments} objectiveId={objective.objective_id} onCommentPosted={handleCommentPosted} /> },
        { name: 'Tree View', content: <TreeViewSection objective={objective} /> },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4">
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Objective Detail</p>
                    <h1 className="text-2xl font-bold text-gray-800">{objective.obj_title}</h1>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                   <Tabs tabs={pageTabs} activeTab={activeTabIndex} onTabChange={handleTabChange} />
                </div>
            </div>
        </div>
    );
};

export default ObjectiveDetailPage;
