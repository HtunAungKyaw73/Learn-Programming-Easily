// ViewTransition is provided by Next.js 16's compiled React when
// experimental.viewTransition is enabled. The standalone react@19 package
// types do not declare it yet; this augmentation bridges the gap.
import type React from "react";

declare module "react" {
  const ViewTransition: React.FC<{ children: React.ReactNode }>;
}
