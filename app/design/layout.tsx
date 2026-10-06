import DesignProviders from "./providers";

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DesignProviders>{children}</DesignProviders>;
}