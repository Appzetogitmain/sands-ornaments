import React, { useState, useMemo } from 'react';
import { Play } from 'lucide-react';
import ImageLightbox from '../../../shared/components/ImageLightbox';
import { useDragScroll } from '../../../../hooks/useDragScroll';
import { getProductDetailUrl, getProductThumbUrl } from '../../../../utils/imageUtils';

const ProductGallery = ({ product, selectedVariant, galleryImages, primaryImage, hoverPaneImage, isImageMedia }) => {
    const [selectedImage, setSelectedImage] = useState(primaryImage);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const thumbScroll = useDragScroll();

    // Sync selectedImage if primaryImage changes from parent (e.g., variant change)
    React.useEffect(() => {
        if (primaryImage) setSelectedImage(primaryImage);
    }, [primaryImage]);

    const handleImageClick = (img) => {
        setSelectedImage(img);
    };

    const openLightbox = (index) => {
        setLightboxIndex(index);
        setIsLightboxOpen(true);
    };

    return (
        <div className="flex flex-col md:flex-row-reverse gap-4 md:gap-6 h-auto md:h-[650px] relative">
            <ImageLightbox
                images={galleryImages}
                currentIndex={lightboxIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                onPrev={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                onNext={(idx) => {
                    if (typeof idx === 'number') setLightboxIndex(idx);
                    else setLightboxIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                }}
            />
            {/* Main Display Area */}
            <div className="flex-1 rounded-[2rem] md:rounded-[2.5rem] bg-[#FAFAFA] flex items-center justify-center p-4 relative group overflow-hidden border border-gray-100 shadow-sm transition-all h-[400px] sm:h-[450px] md:h-full">
                {selectedImage && isImageMedia(selectedImage) ? (
                    <img
                        src={getProductDetailUrl(selectedImage)}
                        alt={product?.name || "Product"}
                        className="w-full h-full object-contain mix-blend-multiply cursor-zoom-in transition-transform duration-700 ease-out group-hover:scale-105"
                        onClick={() => {
                            const idx = galleryImages.indexOf(selectedImage);
                            openLightbox(idx >= 0 ? idx : 0);
                        }}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                    />
                ) : selectedImage ? (
                    <video
                        src={selectedImage}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain mix-blend-multiply"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No media available</div>
                )}


            </div>

            {/* Thumbnails (Left side on desktop, bottom on mobile) */}
            <div
                className="flex md:flex-col gap-3 md:gap-4 overflow-x-auto md:overflow-y-auto md:w-28 pb-2 md:pb-0 scrollbar-hide py-1 md:py-2 px-1"
                ref={thumbScroll.ref}
                {...thumbScroll.events}
                style={{ cursor: thumbScroll.isDragging ? 'grabbing' : 'grab' }}
            >
                {galleryImages.map((img, idx) => (
                    <button
                        key={idx}
                        className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-2xl border-2 overflow-hidden bg-white transition-all duration-300 ${
                            selectedImage === img
                                ? 'border-[#D39A9F] shadow-md scale-105 shadow-[#D39A9F]/20'
                                : 'border-gray-100 hover:border-gray-300 opacity-70 hover:opacity-100 hover:scale-[1.02]'
                        }`}
                        onClick={() => handleImageClick(img)}
                    >
                        {isImageMedia(img) ? (
                            <img
                                src={getProductThumbUrl(img)}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 relative group">
                                <video src={img} className="w-full h-full object-cover opacity-50" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                    <Play className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" />
                                </div>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ProductGallery;
