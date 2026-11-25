import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tamaños de texto propios de DESIGN.md: sin esto, tailwind-merge los confunde con colores.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "headline-xl",
            "headline-xl-movil",
            "headline-lg",
            "headline-lg-movil",
            "headline-md",
            "headline-sm",
            "title",
            "body-lg",
            "body-md",
            "body-sm",
            "campo",
            "label-tag",
            "amount-xl",
            "amount-kpi",
            "label-numeric",
            "label-micro",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
