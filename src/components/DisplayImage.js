import React, { useRef, useCallback } from "react";
import { useZoomImageMove } from "@zoom-image/react";
import TiffImageDisplayFromUrl from "../components/TiffImageDisplayFromUrl";
import Image from "next/image";

function DisplayImage({ url }) {
  const containerRef = useRef(null);
  const { createZoomImage } = useZoomImageMove();

  const handleImageLoad = useCallback(() => {
    if (containerRef.current) {
      createZoomImage(containerRef.current, {
        zoomFactor: 2,
      });
    }
  }, [url]);

  return (
    <div
      className="relative w-full h-auto cursor-crosshair overflow-hidden"
      ref={containerRef}
    >
      {url?.includes(".tif") ? (
        <TiffImageDisplayFromUrl imageUrl={url} />
      ) : (
        <Image
          src={url}
          alt="image"
          width={1500}
          height={400}
          className="object-contain max-h-[40vh]"
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );
}

export default DisplayImage;
