import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Image as ImageIcon, X, Save, ArrowLeft, Calendar, FileText, Eye, EyeOff } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import PageHeader from '../components/common/PageHeader';
import { adminService } from '../services/adminService';
import toast from 'react-hot-toast';

const createEmptyForm = () => ({
  _id: null,
  title: '',
  category: '',
  image: null,
  imagePreview: '',
  excerpt: '',
  content: '',
  author: 'SANDS Admin',
  isPublished: true,
});

const BlogManagement = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm());

  const fetchBlogs = async () => {
    setLoading(true);
    const data = await adminService.getAdminBlogs();
    setBlogs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleEdit = (blog) => {
    setFormData({
      _id: blog._id,
      title: blog.title || '',
      category: blog.category || '',
      image: null,
      imagePreview: blog.coverImage || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      author: blog.author || 'SANDS Admin',
      isPublished: blog.isPublished !== false,
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blog post?')) return;
    const success = await adminService.deleteBlog(id);
    if (success) {
      toast.success('Blog deleted successfully');
      fetchBlogs();
    } else {
      toast.error('Failed to delete blog');
    }
  };

  const handleAddNew = () => {
    setFormData(createEmptyForm());
    setIsEditing(true);
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Blog title is required';
    if (!formData.category.trim()) return 'Blog category is required';
    if (!formData.excerpt.trim()) return 'Blog excerpt is required';
    if (!formData.content || !formData.content.replace(/<[^>]+>/g, '').trim()) return 'Blog content is required';
    return null;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    const data = new FormData();
    data.append('title', formData.title.trim());
    data.append('category', formData.category);
    data.append('excerpt', formData.excerpt.trim());
    data.append('content', formData.content);
    data.append('author', formData.author.trim() || 'SANDS Admin');
    data.append('isPublished', String(Boolean(formData.isPublished)));
    if (formData.image) {
      data.append('image', formData.image);
    } else if (!formData.imagePreview) {
      data.append('removeImage', 'true');
    }

    const res = formData._id
      ? await adminService.updateBlog(formData._id, data)
      : await adminService.createBlog(data);

    if (res.success) {
      toast.success(formData._id ? 'Blog updated successfully' : 'Blog created successfully');
      setIsEditing(false);
      setFormData(createEmptyForm());
      fetchBlogs();
    } else {
      toast.error(res.message || 'Failed to save blog');
    }

    setSaving(false);
  };

  const filteredBlogs = useMemo(() => (
    blogs.filter((blog) => {
      const matchesSearch =
        blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || blog.category === selectedCategory;
      const matchesStatus =
        selectedStatus === 'All' ||
        (selectedStatus === 'Published' && blog.isPublished) ||
        (selectedStatus === 'Draft' && !blog.isPublished);
      return matchesSearch && matchesCategory && matchesStatus;
    })
  ), [blogs, searchTerm, selectedCategory, selectedStatus]);

  const availableCategories = useMemo(() => {
    const unique = new Set(
      (blogs || [])
        .map((blog) => String(blog.category || '').trim())
        .filter(Boolean)
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [blogs]);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500 font-sans">
      {!isEditing ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <PageHeader
              title="Blog Management"
              subtitle="Create, edit, publish, and manage the blog content shown on the user storefront."
            />
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-[#3E2723] text-white rounded-xl text-sm font-bold hover:bg-[#5D4037] transition-all shadow-lg active:scale-95"
            >
              <Plus size={18} />
              Create New Post
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Total Blogs</p>
              <p className="text-3xl font-black text-gray-900 mt-3">{blogs.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Published</p>
              <p className="text-3xl font-black text-emerald-600 mt-3">{blogs.filter((blog) => blog.isPublished).length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Drafts</p>
              <p className="text-3xl font-black text-amber-600 mt-3">{blogs.filter((blog) => !blog.isPublished).length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Public Route</p>
              <p className="text-lg font-bold text-gray-900 mt-3">/blogs</p>
              <p className="text-sm text-gray-500 mt-1">Published posts only</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'All' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All Categories
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === category ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#3E2723]/10 outline-none"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#3E2723]/10 outline-none"
              >
                <option value="All">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E2723]"></div>
              <p className="text-gray-500 font-medium">Loading blog posts...</p>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No blogs found</h3>
              <p className="text-gray-500 text-sm mt-1">Try changing filters or create a new post.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlogs.map((blog) => (
                <div key={blog._id} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={blog.coverImage || 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&q=80&w=600'}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#3E2723]">
                      {blog.category}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-md ${blog.isPublished ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-600'}`}>
                        {blog.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(blog)}
                        className="p-2 bg-white rounded-full text-gray-900 shadow-lg hover:scale-110 transition-transform"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(blog._id)}
                        className="p-2 bg-red-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 font-bold uppercase tracking-wider">
                      <Calendar size={12} />
                      <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{blog.author}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight font-serif">{blog.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{blog.excerpt}</p>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                      /blogs/{blog.slug}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEdit(blog)}
                      className="w-full py-2.5 rounded-lg bg-gray-50 text-gray-900 text-xs font-bold hover:bg-[#3E2723] hover:text-white transition-colors"
                    >
                      Edit Content
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <PageHeader
                title={formData._id ? 'Edit Blog Post' : 'Create Blog Post'}
                subtitle="Manage blog content, publishing, and storefront visibility."
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#3E2723] text-white rounded-xl text-sm font-bold hover:bg-[#5D4037] transition-all shadow-lg active:scale-95 disabled:opacity-60"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Blog'}
            </button>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Blog Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:border-[#3E2723] focus:ring-0 outline-none transition-all"
                      placeholder="Enter blog title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Excerpt</label>
                    <textarea
                      rows="3"
                      value={formData.excerpt}
                      onChange={(event) => setFormData((prev) => ({ ...prev, excerpt: event.target.value }))}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:border-[#3E2723] focus:ring-0 outline-none transition-all resize-none"
                      placeholder="Short summary shown on the blogs listing page"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <FileText className="w-3 h-3" /> Blog Content
                </label>
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                  modules={modules}
                  className="h-[500px] mb-12 bg-white rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Publishing</h3>
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-2xl cursor-pointer bg-white">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(event) => setFormData((prev) => ({ ...prev, isPublished: event.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#3E2723] focus:ring-[#3E2723]"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {formData.isPublished ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-amber-600" />}
                      {formData.isPublished ? 'Published on storefront' : 'Saved as draft'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Only published blogs appear on `/blogs`.
                    </p>
                  </div>
                </label>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Category</label>
                  <input
                    type="text"
                    list="blog-category-suggestions"
                    value={formData.category}
                    onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-[#3E2723]/10 outline-none"
                    placeholder="Enter blog category"
                  />
                  <datalist id="blog-category-suggestions">
                    {availableCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500">
                    You can type any category. Existing blog categories appear as suggestions.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(event) => setFormData((prev) => ({ ...prev, author: event.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-[#3E2723]/10 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Public URL</label>
                  <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500">
                    {formData.title.trim() ? `/blogs/${formData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '/blogs/<auto-slug>'}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Cover Image</h3>
                <div className="w-full aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden relative group flex items-center justify-center">
                  {formData.imagePreview ? (
                    <>
                      <img
                        src={formData.imagePreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, image: null, imagePreview: '' }))}
                        className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center px-6">
                      <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="mt-3 text-sm font-semibold text-gray-700">Upload blog cover image</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setFormData((prev) => ({
                        ...prev,
                        image: file,
                        imagePreview: URL.createObjectURL(file),
                      }));
                    }}
                  />
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1920x1080px (16:9 Ratio)</p>
                </div>
              </div>
            </div>
          </form>

          <style>{`
            .ql-toolbar.ql-snow {
              border-top-left-radius: 0.75rem;
              border-top-right-radius: 0.75rem;
              border-color: #e5e7eb;
              background-color: #f9fafb;
              padding: 12px;
            }
            .ql-container.ql-snow {
              border-bottom-left-radius: 0.75rem;
              border-bottom-right-radius: 0.75rem;
              border-color: #e5e7eb;
              font-family: inherit;
              font-size: 1rem;
            }
            .ql-editor {
              min-height: 320px;
              padding: 1.5rem;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
