import React, { useState, useEffect } from 'react';
import { Link, useForm } from '@inertiajs/react'; // Keep useForm for comments
import { format } from 'date-fns';

// Helper and sub-components can remain mostly the same, but they will receive props from the state of this page.

const getStatusClass = (status) => {
    // ... (same as before)
};
const ProgressBar = ({ progress }) => {
    // ... (same as before)
};

// --- Section Components (no changes needed in their internal logic) ---
const OverviewSection = ({ objective }) => {
    // ... (same as before)
};
const KeyResultsSection = ({ keyResults }) => {
    // ... (same as before)
};
const AlignmentSection = ({ objective }) => {
    // ... (same as before)
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
            if (onSubmitted) {
                onSubmitted();
            }

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
    // ... (same as before)
};
const CommentSection = ({ comments, objectiveId, onCommentPosted }) => {
    // Modified to pass a callback
    const handleSubmitted = () => {
        if (onCommentPosted) onCommentPosted();
    };

    return (
        <div className="mt-4">
            <h4 className="font-semibold text-md mb-2">Thảo luận (Comment)</h4>
            <div className="space-y-4">
                <CommentForm objectiveId={objectiveId} onSubmitted={handleSubmitted} />
                {comments?.length > 0 ? (
                    comments.map(comment => <Comment key={comment.id} comment={comment} objectiveId={objectiveId} />)
                ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có bình luận nào.</p>
                )}
            </div>
        </div>
    );
};
const HistorySection = ({ keyResults, comments, objectiveId, onCommentPosted }) => {
    // ... (same as before, just passes onCommentPosted down)
};


// --- Main Page Component (Rewritten) ---

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
            const response = await fetch(`/company-okrs/${objectiveId}`, {
                headers: {
                    'Accept': 'application/json',
                }
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
    }, [window.location.pathname]); // Re-fetch if the path changes

    if (loading) {
        return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;
    }

    if (!objective) {
        return <div className="p-8 text-center">Không tìm thấy Objective.</div>;
    }

    // When a comment is posted, we just refetch all data to get the latest state
    const handleCommentPosted = () => {
        fetchData(); 
    };
    
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4">
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Objective Detail</p>
                    <h1 className="text-2xl font-bold text-gray-800">{objective.obj_title}</h1>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                    {/* Re-rendering all section components with the fetched data */}
                    {/* Note: a lot of the previous code is identical, just being pasted back in */}
                    <div className="p-4 mb-4 border rounded-lg">
                        <h3 className="font-bold text-lg mb-3">I. Overview (Tổng quan)</h3>
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

                    <div className="p-4 mb-4 border rounded-lg">
                        <h3 className="font-bold text-lg mb-3">II. Key Results (Các KR trực thuộc)</h3>
                        <div className="space-y-3">
                            {objective.key_results?.length > 0 ? objective.key_results.map(kr => (
                                <div key={kr.kr_id} className="p-3 border rounded-md">
                                    <div className="flex justify-between items-start">
                                        <Link href={`#`} className="font-semibold text-blue-600 hover:underline">{kr.kr_title}</Link>
                                        <span className="text-sm font-bold">{kr.progress_percent}%</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Owner: {kr.assigned_user?.full_name || 'N/A'}</div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-teal-500 h-2 rounded-full" style={{ width: `${kr.progress_percent}%` }}></div></div>
                                </div>
                            )) : <p className="text-gray-500">Không có Key Result nào.</p>}
                        </div>
                    </div>

                    <div className="p-4 mb-4 border rounded-lg">
                        <h3 className="font-bold text-lg mb-3">III. Context & Alignment (Ngữ cảnh & Liên kết)</h3>
                        <div className="mb-4">
                            <h4 className="font-semibold text-md mb-2">Liên kết Cấp trên (Parent OKR)</h4>
                            {objective.source_links?.length > 0 ? objective.source_links.map(link => (
                                <div key={link.link_id} className="p-2 border rounded-md bg-gray-50 text-sm">
                                    <Link href={`/company-okrs/detail/${link.target_objective.objective_id}`} className="text-blue-700 hover:underline">{link.target_objective.obj_title}</Link>
                                    <span className="text-gray-500 text-xs"> ({link.target_objective.user?.full_name || link.target_objective.department?.d_name})</span>
                                </div>
                            )) : <p className="text-gray-500 text-sm">Objective này không liên kết lên OKR nào.</p>}
                        </div>
                        <div>
                            <h4 className="font-semibold text-md mb-2">Liên kết Cấp dưới (Child OKR)</h4>
                            {objective.child_objectives?.length > 0 ? objective.child_objectives.map(link => (
                                <div key={link.link_id} className="p-2 border rounded-md bg-gray-50 text-sm">
                                    <Link href={`/company-okrs/detail/${link.source_objective.objective_id}`} className="text-blue-700 hover:underline">{link.source_objective.obj_title}</Link>
                                    <span className="text-gray-500 text-xs"> ({link.source_objective.user?.full_name || link.source_objective.department?.d_name})</span>
                                </div>
                            )) : <p className="text-gray-500 text-sm">Không có OKR nào liên kết với Objective này.</p>}
                        </div>
                    </div>
                    
                    <div className="p-4 mb-4 border rounded-lg">
                        {/* History & Interaction Section */}
                        <h3 className="font-bold text-lg mb-3">IV. History & Interaction (Lịch sử & Tương tác)</h3>
                        {/* ... Check-in history part ... */}
                        <CommentSection comments={objective.comments} objectiveId={objective.objective_id} onCommentPosted={handleCommentPosted} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ObjectiveDetailPage;
