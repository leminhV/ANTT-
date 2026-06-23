import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  upvotes: number;
  created_at: string;
  author: { id: number; name: string; avatar_url: string };
  equipment?: { id: number; name: string };
  _count: { comments: number };
}

export function Community() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await apiClient.get('/api/community/posts');
      setPosts(res.data);
    } catch (err) {
      toast.error('Lỗi khi tải bài viết');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/community/posts', { title, content });
      toast.success(`${t('post')} thành công`);
      setTitle('');
      setContent('');
      setShowForm(false);
      fetchPosts();
    } catch (err) {
      toast.error('Lỗi khi đăng bài');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-[#E2E8F0] dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Cộng đồng Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('share_experience')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium"
        >
          <Plus className="w-4 h-4" /> {t('post')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreatePost} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Tạo bài viết mới</h2>
          <input
            type="text"
            placeholder="Tiêu đề..."
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Nội dung bài viết..."
            required
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Đăng</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center p-8 text-slate-500">Đang tải...</div>
      ) : posts.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('no_posts_yet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-[#E2E8F0] dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">
                  {post.author?.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : post.author?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{post.title}</h3>
                  <div className="text-sm text-slate-500 mb-2">Đăng bởi {post.author?.name} • {new Date(post.created_at).toLocaleString('vi-VN')}</div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-line">{post.content}</p>
                  
                  {post.equipment && (
                    <span className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-md mb-4">
                      Tag: {post.equipment.name}
                    </span>
                  )}
                  
                  <div className="flex gap-4 text-slate-500 text-sm">
                    <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      <ThumbsUp className="w-4 h-4" /> {post.upvotes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                      <MessageSquare className="w-4 h-4" /> {post._count?.comments || 0}
                    </button>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {post.views}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
