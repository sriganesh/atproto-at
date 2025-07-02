import React, { useState } from 'react';
import ImageModal from './ImageModal';

type ImageData = {
  alt?: string;
  image: {
    ref: {
      $link: string;
    };
    mimeType: string;
  };
  aspectRatio?: {
    width: number;
    height: number;
  };
};

type ImageEmbedProps = {
  images: ImageData[];
  authorDid?: string;
};

export default function ImageEmbed({ images, authorDid }: ImageEmbedProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!images.length) return null;

  // Convert bsky blob link to a viewable URL
  const getBlobUrl = (link: string) => {
    // Link is in $link format, extract the CID
    const cid = link.replace('$link', '').trim();
    
    // If we have an authorDid, include it in the URL
    if (authorDid) {
      return `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${cid}@jpeg`;
    }
    
    // Fallback to the old format (may not work for all images)
    console.warn(`No authorDid provided for image ${cid}, URL might not work`);
    return `https://cdn.bsky.app/img/feed_thumbnail/plain/${cid}@jpeg`;
  };

  // Open modal with specific image
  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <>
      {/* For single image */}
      {images.length === 1 ? (
        <div className="mt-3">
          <div 
            className="inline-block cursor-pointer hover:opacity-90 hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden shadow-md" 
            onClick={() => openModal(0)}
          >
            <img
              src={getBlobUrl(images[0].image.ref.$link)}
              alt={images[0].alt || "Embedded image"}
              className="block object-contain"
              style={{ maxHeight: '400px', maxWidth: '100%' }}
            />
          </div>
        </div>
      ) : (
        /* For multiple images */
        <div className="mt-3 grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div key={index}>
              <div 
                className="inline-block cursor-pointer hover:opacity-90 hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden shadow-md" 
                onClick={() => openModal(index)}
              >
                <img
                  src={getBlobUrl(image.image.ref.$link)}
                  alt={image.alt || `Embedded image ${index + 1}`}
                  className="block object-contain"
                  style={{ maxHeight: '250px', maxWidth: '100%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        images={images}
        currentIndex={currentImageIndex}
        isOpen={modalOpen}
        onClose={closeModal}
        authorDid={authorDid}
      />
    </>
  );
} 