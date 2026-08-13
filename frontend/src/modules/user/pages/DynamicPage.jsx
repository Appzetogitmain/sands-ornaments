import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import api from "../../../services/api";
import Loader from "../../shared/components/Loader";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

const DynamicPage = ({ slug: propSlug }) => {
  const { slug: paramSlug } = useParams();
  const slug = propSlug || paramSlug;
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const res = await api.get(`public/pages/${slug}`);
        if (res.data.success) {
          setPage(res.data.data.page);
        }
      } catch (err) {
        console.error("Fetch page failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  useEffect(() => {
    if (page?.title) {
      document.title = `${page.title} | Sands Jewels`;
    } else {
      document.title = "Sands Jewels";
    }
  }, [page]);

  const updatedAtLabel =
    page?.lastUpdated || page?.updatedAt || page?.createdAt || null;
  const hasContent = Boolean(String(page?.content || "").trim());

  if (loading) return <Loader />;

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF5F6] text-center px-4">
        <h1 className="text-4xl font-display text-black mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-[#3E2723] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#5D4037] transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF5F6] selection:bg-[#3E2723] selection:text-white pb-20">
      <div className="container mx-auto px-4 max-w-5xl pt-10 md:pt-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-black/40 hover:text-black transition-all group font-bold uppercase tracking-widest text-[10px] mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="text-center mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-black mb-6 leading-tight break-words">
            {page.title}
          </h1>
          <div className="w-24 h-0.5 bg-[#3E2723]/10 mx-auto mb-6"></div>
          {updatedAtLabel && (
            <div className="flex items-center justify-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-black/30">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>
                  Last updated {new Date(updatedAtLabel).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2rem] p-6 sm:p-10 md:p-12 shadow-sm border border-[#3E2723]/5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {hasContent ? (
            <div
              className="rich-text-content text-gray-700"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
            />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#3E2723]/10 bg-[#FDF5F6] px-6 py-12 text-center">
              <h2 className="text-2xl font-display text-black mb-3">
                Content coming soon
              </h2>
              <p className="text-gray-500 font-serif">
                This page has been created, but the content has not been
                published yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicPage;
