import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import api from "../../../services/api";
import blogFallback from "@assets/trending_heritage.png";
import Loader from "../../shared/components/Loader";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

const blogFallbackImage = blogFallback;

const BlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      setLoading(true);
      try {
        const res = await api.get(`public/blogs/${slug}`);
        if (res.data.success) {
          setBlog(res.data.data.blog);
        } else {
          setBlog(null);
        }
      } catch (err) {
        console.error("Fetch blog failed:", err);
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  useEffect(() => {
    document.title = blog?.title
      ? `${blog.title} | Sands Jewels`
      : "Blog | Sands Jewels";
  }, [blog]);

  if (loading) return <Loader />;

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF5F6] text-center px-4">
        <h1 className="text-4xl font-display text-black mb-4">
          Article Not Found
        </h1>
        <p className="text-gray-500 mb-8">
          This article is unavailable or no longer published.
        </p>
        <Link
          to="/blogs"
          className="px-8 py-3 bg-[#3E2723] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#5D4037] transition-all"
        >
          Back to Blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF5F6] selection:bg-[#3E2723] selection:text-white pb-20">
      <div className="container mx-auto px-4 max-w-5xl pt-12 md:pt-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-black/40 hover:text-black transition-all group font-bold uppercase tracking-widest text-[10px] mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="text-center mb-10 md:mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3E2723]/50">
            {blog.category}
          </p>
          <h1 className="mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-display text-black leading-tight break-words">
            {blog.title}
          </h1>
          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-black/30">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>
                {new Date(
                  blog.publishedAt || blog.createdAt,
                ).toLocaleDateString()}
              </span>
            </div>
            <span>•</span>
            <span>{blog.author}</span>
          </div>
          {blog.excerpt && (
            <p className="mt-6 max-w-3xl mx-auto text-base md:text-lg font-serif text-gray-600">
              {blog.excerpt}
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-[2.5rem] border border-[#3E2723]/8 shadow-sm bg-white">
          <div className="aspect-[16/8] bg-gray-100">
            <img
              src={blog.coverImage || blogFallbackImage}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-5 sm:p-8 md:p-14">
            <div
              className="rich-text-content text-gray-700"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(blog.content) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
