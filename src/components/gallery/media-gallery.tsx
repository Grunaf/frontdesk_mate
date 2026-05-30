"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";

const media = [
{
    type: "video",
    src: "/videos/room_tour.mp4",
    label: "Room Tour"
},
{
    type: "image",
    src: "/images/backyard.jpg",
    label: "Backyard"
},
{
    type: "image",
    src: "/images/kitchen.jpg",
    label: "Kitchen"
},
{
    type: "image",
    src: "/images/frontdesk.jpg",
    label: "Front Desk"
},
{
    type: "image",
    src: "/images/room.jpg",
    label: "Room"
},
]

export default function MediaGallery() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
  });
  const [thumbsRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "keepSnaps",
  });

  return (
    <section className="space-y-4">
      <div
        className="overflow-hidden rounded-3xl"
        ref={emblaRef}
      >
        <div className="flex">
          {media.map((item, index) => (
            <div
              key={index}
              className="relative min-w-0 flex-[0_0_100%] aspect-[16/9] overflow-hidden"
            >
              {item.type === "video" ? (
                <video
                src={item.src}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={item.src}
                  alt={item.label}
                  fill
                  className="object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </div>

    <div
    className="overflow-hidden"
    ref={thumbsRef}
    >
    <div className="flex gap-2">
        {media.map((item, index) => (
        <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className="relative min-w-0 flex-[0_0_90px] aspect-square overflow-hidden rounded-2xl"
        >
                {item.type === "video" ? (
                <>
                    <video
                    src={item.src}
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/20" />
                </>
                ) : (
                <Image
                    src={item.src}
                    alt={item.label}
                    fill
                    className="object-cover"
                />
                )}
            </button>
            ))}
        </div>
    </div>
    </section>
  );
}
