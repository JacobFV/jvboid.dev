import Image from "next/image";
import type { Node } from "@/lib/graph-types";
import { imageRefsForNode } from "@/lib/project-face";

// The picture beside a post in the /posts index: the post's own hero, else
// the first picture its body places. A post with no picture of its own gets
// no thumbnail at all — nothing drawn to stand in for one — and its row is
// set as text alone.

const unoptimizable = (src: string) => !src.startsWith("/") || /\.(?:svg|gif)(?:[?#]|$)/i.test(src);

/** The post's own picture, if it has one. */
export function postThumbImage(node: Node): { src: string } | undefined {
  const image = imageRefsForNode(node)[0];
  return image ? { src: image.src } : undefined;
}

export function PostThumb({ image, className }: { image: { src: string }; className?: string }) {
  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-[3px] border border-[var(--color-rule)] bg-[var(--color-bg-1)] ${className ?? ""}`}
    >
      <Image
        src={image.src}
        alt=""
        fill
        sizes="(min-width: 640px) 8rem, 6rem"
        unoptimized={unoptimizable(image.src)}
        className="object-cover"
      />
    </div>
  );
}
