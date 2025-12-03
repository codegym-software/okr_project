import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { format } from 'date-fns';

// --- Reusable Tabs Component ---
const Tabs = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(index)}
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


// --- Section Components (unchanged) ---
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
            <div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{ width: `${objective.progress_percent}%` }}></div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">Trạng thái: </span><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(objective.status)}`}>{objective.status?.replace('_', ' ').toUpperCase() || 'N/A'}</span></div>
            <div><span className="font-semibold">Chu kỳ: </span><span>{objective.cycle?.cycle_name || 'N/A'}</span></div>
            <div><span className="font-semibold">Chủ sở hữu: </span><span>{objective.user?.full_name || objective.department?.d_name || 'N/A'}</span></div>
            <div className="col-span-2"><p className="font-semibold">Mô tả:</p><p className="text-gray-600 whitespace-pre-wrap mt-1">{objective.description || 'Không có mô tả.'}</p></div>
        </div>
    </div>
);

const KeyResultsSection = ({ keyResults }) => (
    <div className="space-y-3">
        {keyResults?.length > 0 ? keyResults.map(kr => (
            <div key={kr.kr_id} className="p-3 border rounded-md">
                <div className="flex justify-between items-start">
                    <a href={`/company-okrs/detail/kr/${kr.kr_id}`} className="font-semibold text-blue-600 hover:underline">{kr.kr_title}</a>
                    <span className="text-sm font-bold">{kr.progress_percent}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Owner: {kr.assigned_user?.full_name || 'N/A'}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-teal-500 h-2 rounded-full" style={{ width: `${kr.progress_percent}%` }}></div></div>
            </div>
        )) : <p className="text-gray-500">Không có Key Result nào.</p>}
    </div>
);

const AlignmentSection = ({ objective }) => (
    <div>
        <div className="mb-4">
            <h4 className="font-semibold text-md mb-2">Liên kết Cấp trên (Parent OKR)</h4>
            {objective.source_links?.length > 0 ? objective.source_links.map(link => (
                <div key={link.link_id} className="p-2 border rounded-md bg-gray-50 text-sm">
                    <a href={`/company-okrs/detail/${link.target_objective.objective_id}`} className="text-blue-700 hover:underline">{link.target_objective.obj_title}</a>
                    <span className="text-gray-500 text-xs"> ({link.target_objective.user?.full_name || link.target_objective.department?.d_name})</span>
                </div>
            )) : <p className="text-gray-500 text-sm">Objective này không liên kết lên OKR nào.</p>}
        </div>
        <div>
            <h4 className="font-semibold text-md mb-2">Liên kết Cấp dưới (Child OKR)</h4>
            {objective.child_objectives?.length > 0 ? objective.child_objectives.map(link => (
                 <div key={link.link_id} className="p-2 border rounded-md bg-gray-50 text-sm">
                    <a href={`/company-okrs/detail/${link.source_objective.objective_id}`} className="text-blue-700 hover:underline">{link.source_objective.obj_title}</a>
                    <span className="text-gray-500 text-xs"> ({link.source_objective.user?.full_name || link.source_objective.department?.d_name})</span>
                </div>
            )) : <p className="text-gray-500 text-sm">Không có OKR nào liên kết với Objective này.</p>}
        </div>
    </div>
);

const HistorySection = ({ keyResults, comments, objectiveId, onCommentPosted }) => {
    // This section now combines Check-ins and Comments
    const allCheckIns = keyResults.flatMap(kr => kr.check_ins.map(ci => ({ ...ci, kr_title: kr.kr_title })));
    allCheckIns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
        <div>
            <div className="mb-6">
                <h4 className="font-semibold text-md mb-2">Lịch sử Check-in</h4>
                 {allCheckIns.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                        {allCheckIns.map(ci => (
                            <div key={ci.check_in_id} className="text-sm p-2 border-l-4 border-gray-200">
                                <p><strong>{ci.user?.full_name || '...'}</strong> đã check-in cho KR <strong>"{ci.kr_title}"</strong></p>
                                <p className="text-gray-700 mt-1">"{ci.notes || 'Không có ghi chú'}"</p>
                                <div className="text-xs text-gray-500 mt-1">
                                    <span>{format(new Date(ci.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                    <span className="ml-2 font-semibold">→ {ci.progress_percent}%</span>
                                </div>
                            </div>
                        ))}
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

            setContent('');
            if (onSubmitted) onSubmitted();
        } catch (error) {
            setErrors({ form: 'Could not submit your comment. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className={`mt-2 ${parentId ? 'ml-8' : ''}`}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                placeholder={parentId ? "Viết trả lời..." : "Viết bình luận..."}
                rows={parentId ? 2 : 3}
            ></textarea>
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content[0]}</p>}
            {errors.form && <p className="text-red-500 text-xs mt-1">{errors.form}</p>}
            <div className="flex justify-end mt-2">
                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                    {processing ? 'Đang gửi...' : 'Gửi'}
                </button>
            </div>
        </form>
    );
};

const Comment = ({ comment, objectiveId }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    return (
        <div className="py-2">
            <div className="flex items-start">
                <img src={comment.user?.avatar_url || '/images/default.png'} alt={comment.user?.full_name} className="w-8 h-8 rounded-full mr-3" />
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                    <div className="font-semibold text-sm">{comment.user?.full_name}</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                </div>
            </div>
            <div className="ml-11 text-xs text-gray-500 mt-1 flex items-center">
                <span>{format(new Date(comment.created_at), 'dd/MM/yyyy')}</span>
                <button onClick={() => setShowReplyForm(!showReplyForm)} className="ml-4 font-semibold hover:underline">Trả lời</button>
            </div>
            {showReplyForm && <CommentForm objectiveId={objectiveId} parentId={comment.id} onSubmitted={() => setShowReplyForm(false)} />}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 mt-2 pl-4 border-l-2">
                    {comment.replies.map(reply => <Comment key={reply.id} comment={reply} objectiveId={objectiveId} />)}
                </div>
            )}
        </div>
    );
};

const CommentSection = ({ comments, objectiveId, onCommentPosted }) => {
    const handleSubmitted = () => {
        if (onCommentPosted) onCommentPosted();
    };

    return (
        <div className="mt-4">
            <h4 className="font-semibold text-md mb-2">Thảo luận (Comment)</h4>
            <div className="space-y-4">
                <CommentForm objectiveId={objectiveId} onSubmitted={handleSubmitted} />
                {comments?.length > 0 ? (
                    comments.map(comment => (
                        <Comment key={comment.id} comment={comment} objectiveId={objectiveId} />
                    ))
                ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có bình luận nào.</p>
                )}
            </div>
        </div>
    );
};


// --- Main Page Component (Refactored for Tabs) ---

const ObjectiveDetailPage = () => {
    const [objective, setObjective] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

        try {
            setLoading(true);
            const response = await fetch(`/company-okrs/${objectiveId}?_t=${new Date().getTime()}`, {
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
    }, [window.location.pathname]);

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;
    if (!objective) return <div className="p-8 text-center">Không tìm thấy Objective.</div>;

    const handleCommentPosted = () => fetchData();
    
    const pageTabs = [
        { name: 'Tổng quan', content: <OverviewSection objective={objective} /> },
        { name: 'Key Results', content: <KeyResultsSection keyResults={objective.key_results} /> },
        { name: 'Ngữ cảnh & Liên kết', content: <AlignmentSection objective={objective} /> },
        { name: 'Lịch sử & Tương tác', content: <HistorySection keyResults={objective.key_results} comments={objective.comments} objectiveId={objective.objective_id} onCommentPosted={handleCommentPosted} /> },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4">
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Objective Detail</p>
                    <h1 className="text-2xl font-bold text-gray-800">{objective.obj_title}</h1>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                   <Tabs tabs={pageTabs} />
                </div>
            </div>
        </div>
    );
};

export default ObjectiveDetailPage;
