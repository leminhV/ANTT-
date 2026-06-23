import React, { useState, useEffect } from 'react';
import { commentService } from '../../services';
import { Send, CornerDownRight, MessageSquare, Trash2, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export interface IComment {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  user?: {
    name: string;
    avatar_url?: string;
    role?: string;
  };
  replies?: IComment[];
}

interface CommentProps {
  entityType: 'report' | 'booking' | 'equipment';
  entityId: number;
  currentUser: { id: number; role: string; [key: string]: unknown } | null;
}

import { useTranslation } from 'react-i18next';

export function CommentSection({ entityType, entityId, currentUser }: CommentProps) {
  const [comments, setComments] = useState<IComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchComments();
  }, [entityId]);

  const fetchComments = async () => {
    try {
      const res = await commentService.getAll(
        entityType === 'report' ? entityId : undefined,
        entityType === 'booking' ? entityId : undefined,
        entityType === 'equipment' ? entityId : undefined
      );
      setComments(res.data);
    } catch (error) {
      // apiClient.ts đã xử lý toast
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const payload: {
        content: string;
        reportId?: number;
        bookingId?: number;
        equipmentId?: number;
        parentId?: number;
      } = { content: newComment };
      if (entityType === 'report') payload.reportId = entityId;
      if (entityType === 'booking') payload.bookingId = entityId;
      if (entityType === 'equipment') payload.equipmentId = entityId;
      if (replyTo) payload.parentId = replyTo.id;

      await commentService.create(payload);
      setNewComment('');
      setReplyTo(null);
      fetchComments();
    } catch (error) {
      // apiClient.ts đã xử lý toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('confirm_delete_comment'))) return;
    try {
      await commentService.delete(id);
      fetchComments();
    } catch (error) {
      // apiClient.ts đã xử lý toast
    }
  };

  const renderComment = (comment: IComment, isReply = false) => {
    const isOwner = currentUser?.id === comment.user_id;
    const canDelete =
      isOwner || currentUser?.role === 'ADMIN' || currentUser?.role === 'TECHNICIAN';

    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-10 mt-3 relative' : 'mt-4'}`}>
        {isReply && (
          <div className="absolute -left-6 top-0 w-4 h-6 border-l-2 border-b-2 border-[#E0E0E0] dark:border-slate-800 rounded-bl-lg" />
        )}
        <div className="flex-shrink-0 mt-1">
          {comment.user?.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover border border-[#E0E0E0] dark:border-slate-800"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1E5FA5] dark:bg-blue-600/10 flex items-center justify-center text-[#1E5FA5] dark:text-blue-400">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 bg-[#F5F5F5] dark:bg-slate-800/50 rounded-2xl rounded-tl-none p-3 relative group">
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold text-[13px] text-[#212121] dark:text-slate-100">
              {comment.user?.name || t('user_role')}
              {comment.user?.role === 'ADMIN' && (
                <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                  {t('admin_role')}
                </span>
              )}
              {comment.user?.role === 'TECHNICIAN' && (
                <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                  {t('technician_role')}
                </span>
              )}
            </span>
            <span className="text-[11px] text-[#9E9E9E]">
              {format(new Date(comment.created_at), 'HH:mm - dd/MM/yyyy', { locale: vi })}
            </span>
          </div>
          <p className="text-[13px] text-[#424242] whitespace-pre-wrap leading-relaxed">
            {comment.content}
          </p>

          <div className="flex items-center gap-4 mt-2">
            {!isReply && (
              <button
                onClick={() => setReplyTo({ id: comment.id, name: comment.user?.name || t('user_role') })}
                className="text-[11px] font-bold text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" /> Phản hồi
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-[11px] font-bold text-[#757575] dark:text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Xóa
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-t border-[#E0E0E0] dark:border-slate-800">
      <div className="p-4 border-b border-[#E0E0E0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/30 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#757575] dark:text-slate-400" />
        <h3 className="font-bold text-[#212121] dark:text-slate-100 text-[14px]">
          {t('discussion')} (
          {comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[#9E9E9E]">
            <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[13px]">{t('no_discussion')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {comment.replies &&
                  comment.replies.map((reply: IComment) => renderComment(reply, true))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#E0E0E0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/30">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-[#E3F2FD] text-[#1E5FA5] dark:text-blue-400 rounded-md text-[12px] font-medium border border-[#BBDEFB]">
            <span className="flex items-center gap-2">
              <CornerDownRight className="w-3 h-3" /> {t('replying_to')}{' '}
              <strong>{replyTo.name}</strong>
            </span>
            <button onClick={() => setReplyTo(null)} className="hover:text-red-500">
              {t('cancel')}
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              replyTo ? `${t('enter_reply_for')}${replyTo.name}...` : t('write_new_comment')
            }
            className="flex-1 resize-none bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50 min-h-[44px] max-h-[120px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !newComment.trim()}
            className="w-[44px] h-[44px] flex items-center justify-center bg-[#1E5FA5] dark:bg-blue-600 text-white rounded-xl hover:bg-[#154a85] dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
