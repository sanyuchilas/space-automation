export const isProduction = () =>
  import.meta.env.VITE_NODE_ENV === "production";
